import React, { useEffect, useMemo, useState } from "react";
import { CircleCheck, Lock, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import {
  getFixturesByRound,
  getRounds,
  getSeasonFixtures,
  SEASON,
} from "../services/api";

const RODADAS_FALLBACK = Array.from({ length: 38 }, (_, i) => i + 1);
const STATUS_ENCERRADOS = new Set([
  "FINISHED",
  "AWARDED",
  "CANCELED",
  "CANCELLED",
]);

const extrairRodadaAtual = (data) => {
  const candidatos = [
    data?.currentMatchday,
    data?.currentRound,
    data?.round,
    data?.season?.currentMatchday,
    data?.resultSet?.currentMatchday,
  ];

  return candidatos.map(Number).find((valor) => Number.isInteger(valor)) || null;
};

const calcularRodadaAtual = (matches = []) => {
  const jogosPorRodada = new Map();

  matches.forEach((jogo) => {
    const rodada = Number(jogo.matchday || jogo.rodada);

    if (!Number.isInteger(rodada)) return;

    if (!jogosPorRodada.has(rodada)) {
      jogosPorRodada.set(rodada, []);
    }

    jogosPorRodada.get(rodada).push(jogo);
  });

  const rodadasOrdenadas = Array.from(jogosPorRodada.keys()).sort(
    (rodadaA, rodadaB) => rodadaA - rodadaB
  );

  const agora = Date.now();
  const rodadaAberta = rodadasOrdenadas.find((rodada) =>
    jogosPorRodada.get(rodada).some((jogo) => {
      const dataJogo = jogo.utcDate ? new Date(jogo.utcDate).getTime() : null;
      const jogoFuturo = Number.isFinite(dataJogo) && dataJogo >= agora;

      return jogoFuturo || !STATUS_ENCERRADOS.has(jogo.status);
    })
  );

  return rodadaAberta || rodadasOrdenadas.at(-1) || 1;
};

export default function TabelaBolao() {
  const [rodadaSelecionada, setRodadaSelecionada] = useState("1");
  const [jogos, setJogos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [user, setUser] = useState(null);
  const [meuParticipante, setMeuParticipante] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroJogos, setErroJogos] = useState("");
  const [rodadas, setRodadas] = useState(RODADAS_FALLBACK);
  const [rodadaAtual, setRodadaAtual] = useState(null);
  const [rodadasSalvas, setRodadasSalvas] = useState(() => new Set());

  useEffect(() => {
    const carregarRodadas = async () => {
      try {
        const data = await getRounds();
        const matchdays = data.matchdays?.length ? data.matchdays : RODADAS_FALLBACK;
        setRodadas(matchdays);

        const rodadaAtualDaApi = extrairRodadaAtual(data);

        if (rodadaAtualDaApi) {
          setRodadaAtual(rodadaAtualDaApi);
          setRodadaSelecionada((rodadaSelecionadaAtual) => {
            const selecionada = Number(rodadaSelecionadaAtual);

            return selecionada >= rodadaAtualDaApi
              ? rodadaSelecionadaAtual
              : String(rodadaAtualDaApi);
          });
        }
      } catch (error) {
        console.error("Erro ao carregar rodadas:", error);
        setRodadas(RODADAS_FALLBACK);
      }
    };

    carregarRodadas();
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarRodadaAtual = async () => {
      try {
        const data = await getSeasonFixtures();
        if (!ativo) return;

        const rodadaCalculada =
          extrairRodadaAtual(data) || calcularRodadaAtual(data.matches || []);

        setRodadaAtual(rodadaCalculada);
        setRodadaSelecionada((rodadaSelecionadaAtual) => {
          const selecionada = Number(rodadaSelecionadaAtual);

          return selecionada >= rodadaCalculada
            ? rodadaSelecionadaAtual
            : String(rodadaCalculada);
        });
      } catch (error) {
        console.error("Erro ao calcular rodada atual:", error);
      }
    };

    carregarRodadaAtual();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const carregarSessao = async () => {
      const {
        data: { user: usuarioLogado },
      } = await supabase.auth.getUser();

      setUser(usuarioLogado ?? null);
    };

    carregarSessao();
  }, []);

  useEffect(() => {
    const carregarParticipantes = async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar participantes:", error);
        return;
      }

      setParticipantes(data || []);
    };

    carregarParticipantes();
  }, []);

  useEffect(() => {
    const carregarMeuParticipante = async () => {
      if (!user) {
        setMeuParticipante(null);
        return;
      }

      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao buscar meu participante:", error);
        return;
      }

      setMeuParticipante(data);
    };

    carregarMeuParticipante();
  }, [user]);

  useEffect(() => {
    const carregarJogos = async () => {
      setLoading(true);

      try {
        const data = await getFixturesByRound(rodadaSelecionada);
        setJogos(data.matches || []);
        setErroJogos("");
      } catch (error) {
        console.error("Erro ao buscar jogos:", error);
        setJogos([]);
        setErroJogos("Nao foi possivel carregar os jogos da rodada.");
      } finally {
        setLoading(false);
      }
    };

    carregarJogos();
  }, [rodadaSelecionada]);

  useEffect(() => {
    const carregarPalpites = async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("round", Number(rodadaSelecionada))
        .eq("season", SEASON);

      if (error) {
        console.error("Erro ao carregar palpites:", error);
        return;
      }

      const mapa = {};

      (data || []).forEach((item) => {
        if (!mapa[item.participant_id]) {
          mapa[item.participant_id] = {};
        }

        mapa[item.participant_id][item.match_id] =
          `${item.home_goals}-${item.away_goals}`;
      });

      setPalpites(mapa);

      if (meuParticipante) {
        const rodadaNumero = Number(rodadaSelecionada);
        const temPalpiteMeu = (data || []).some(
          (item) => String(item.participant_id) === String(meuParticipante.id)
        );

        setRodadasSalvas((prev) => {
          const next = new Set(prev);

          if (temPalpiteMeu) {
            next.add(rodadaNumero);
          } else {
            next.delete(rodadaNumero);
          }

          return next;
        });
      }
    };

    carregarPalpites();
  }, [meuParticipante, rodadaSelecionada]);

  const formatarPalpite = (valor) => {
    const numeros = valor.replace(/\D/g, "").slice(0, 2);

    if (numeros.length <= 1) return numeros;
    return `${numeros[0]}-${numeros[1]}`;
  };

  const handlePalpiteChange = (participanteId, jogoId, valor) => {
    const formatado = formatarPalpite(valor);

    setPalpites((prev) => ({
      ...prev,
      [participanteId]: {
        ...prev[participanteId],
        [jogoId]: formatado,
      },
    }));
  };

  const parsePalpite = (palpite) => {
    if (!palpite || !palpite.includes("-")) return null;

    const [casa, fora] = palpite.split("-").map(Number);

    if (Number.isNaN(casa) || Number.isNaN(fora)) return null;

    return { casa, fora };
  };

  const resultadoPartida = (casa, fora) => {
    if (casa > fora) return "CASA";
    if (fora > casa) return "FORA";
    return "EMPATE";
  };

  const tipoAcerto = (palpiteTexto, jogo) => {
    const palpite = parsePalpite(palpiteTexto);
    const realCasa = jogo.score?.fullTime?.home;
    const realFora = jogo.score?.fullTime?.away;

    if (!palpite) return "nenhum";
    if (realCasa == null || realFora == null) return "nenhum";

    const cravou = palpite.casa === realCasa && palpite.fora === realFora;
    if (cravou) return "cravada";

    const resultadoPalpite = resultadoPartida(palpite.casa, palpite.fora);
    const resultadoReal = resultadoPartida(realCasa, realFora);

    if (resultadoPalpite === resultadoReal) return "vencedor";

    return "nenhum";
  };

  const pontosCelula = (palpiteTexto, jogo) => {
    const tipo = tipoAcerto(palpiteTexto, jogo);
    if (tipo === "cravada") return 3;
    if (tipo === "vencedor") return 1;
    return 0;
  };

  const totalParticipante = (participanteId) => {
    return jogos.reduce((total, jogo) => {
      const palpite = palpites[participanteId]?.[jogo.id] || "";
      return total + pontosCelula(palpite, jogo);
    }, 0);
  };

  const classeCelula = (palpiteTexto, jogo, podeEditar) => {
    const tipo = tipoAcerto(palpiteTexto, jogo);

    if (tipo === "cravada") {
      return "bg-emerald-500 text-white border-emerald-500";
    }

    if (tipo === "vencedor") {
      return "bg-sky-500 text-white border-sky-500";
    }

    if (!podeEditar) {
      return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
    }

    return "bg-white text-zinc-800 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-700";
  };

  const placarFinal = (jogo) => {
    const casa = jogo.score?.fullTime?.home;
    const fora = jogo.score?.fullTime?.away;

    if (casa == null || fora == null) return "-";
    return `${casa}-${fora}`;
  };

  const rodadaSelecionadaNumero = Number(rodadaSelecionada);
  const minhaLinhaId = meuParticipante?.id ?? null;
  const rodadaAnterior =
    Number.isInteger(rodadaAtual) && rodadaSelecionadaNumero < rodadaAtual;
  const rodadaJaSalva = rodadasSalvas.has(rodadaSelecionadaNumero);
  const podeEditarMinhaLinha =
    Boolean(meuParticipante) &&
    !loading &&
    !erroJogos &&
    !rodadaAnterior &&
    !rodadaJaSalva;
  const botaoSalvarDesativado =
    salvando ||
    loading ||
    Boolean(erroJogos) ||
    jogos.length === 0 ||
    rodadaAnterior ||
    rodadaJaSalva;
  const textoBotaoSalvar = salvando
    ? "Salvando..."
    : rodadaJaSalva
    ? "Palpites salvos"
    : rodadaAnterior
    ? "Rodada encerrada"
    : "Salvar palpites";

  const salvarMeusPalpites = async () => {
    if (!meuParticipante) return;

    if (rodadaAnterior) {
      toast.error("Rodadas anteriores estao fechadas para novos palpites.");
      return;
    }

    if (rodadaJaSalva) {
      toast("Seus palpites desta rodada ja foram salvos.");
      return;
    }

    setSalvando(true);

    try {
      const payload = jogos
        .map((jogo) => {
          const valor = palpites[meuParticipante.id]?.[jogo.id] || "";
          const palpite = parsePalpite(valor);

          if (!palpite) return null;

          return {
            participant_id: meuParticipante.id,
            match_id: jogo.id,
            round: Number(rodadaSelecionada),
            season: SEASON,
            home_goals: palpite.casa,
            away_goals: palpite.fora,
          };
        })
        .filter(Boolean);

      if (jogos.length === 0) {
        toast.error("Nao ha jogos nesta rodada.");
        return;
      }

      if (payload.length !== jogos.length) {
        toast.error("Preencha todos os palpites da rodada antes de salvar.");
        return;
      }

      const { error } = await supabase
        .from("predictions")
        .upsert(payload, {
          onConflict: "participant_id,match_id,season",
        });

      if (error) {
        console.error("Erro ao salvar palpites:", error);
        toast.error("Erro ao salvar palpites.");
        return;
      }

      setRodadasSalvas((prev) => {
        const next = new Set(prev);
        next.add(rodadaSelecionadaNumero);
        return next;
      });
      toast.success("Palpites salvos com sucesso.");
    } finally {
      setSalvando(false);
    }
  };

  const tabelaPronta = useMemo(
    () => !loading && !erroJogos && participantes.length > 0,
    [erroJogos, loading, participantes.length]
  );

  const renderCelulaBloqueada = (valor, jogo, destaqueSalvo = false) => {
    const baseClasses = `relative inline-flex min-h-[42px] min-w-[70px] items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold ${classeCelula(
      valor,
      jogo,
      false
    )}`;
    const destaqueClasses = destaqueSalvo ? " ring-2 ring-emerald-200" : "";
    const IconeBloqueio = destaqueSalvo ? CircleCheck : Lock;
    const corIcone = destaqueSalvo ? "text-emerald-600 dark:text-emerald-300" : "text-zinc-400 dark:text-zinc-500";

    return (
      <div className="flex items-center justify-center">
        <div className={`${baseClasses}${destaqueClasses}`}>
          <span className="pr-4">{valor || "-"}</span>
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${corIcone}`}
            title={destaqueSalvo ? "Palpite salvo" : "Palpite bloqueado"}
          >
            <IconeBloqueio className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    );
  };

  if (loading && jogos.length === 0) {
    return (
      <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando tabela...</p>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
            Bolão
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Palpites da rodada
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-zinc-700 dark:bg-emerald-950/40 dark:text-emerald-100">
            <span className="h-4 w-4 rounded-md bg-emerald-500" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span>CRAVADA +3</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-zinc-700 dark:bg-sky-950/40 dark:text-sky-100">
            <span className="h-4 w-4 rounded-md bg-sky-500" />
            <span className="h-3 w-3 rounded-full bg-sky-400" />
            <span>VENCEDOR +1</span>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="rodada" className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Rodada
            </label>

            <select
              id="rodada"
              value={rodadaSelecionada}
              onChange={(e) => setRodadaSelecionada(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {rodadas.map((rodada) => (
                <option key={rodada} value={rodada}>
                  Rodada {rodada}
                  {Number.isInteger(rodadaAtual) && Number(rodada) < rodadaAtual
                    ? " (encerrada)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {meuParticipante && (
            <button
              onClick={salvarMeusPalpites}
              disabled={botaoSalvarDesativado}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Save className="h-4 w-4" />
              {textoBotaoSalvar}
            </button>
          )}
        </div>
      </div>

      {erroJogos && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {erroJogos}
        </div>
      )}

      {meuParticipante && rodadaAnterior && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Rodadas anteriores estao fechadas para novos palpites.
        </div>
      )}

      {meuParticipante && !rodadaAnterior && rodadaJaSalva && (
        <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          Seus palpites desta rodada ja foram salvos.
        </div>
      )}

      {tabelaPronta && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-b border-zinc-200 bg-zinc-50 px-4 py-4 text-left text-sm font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                  PARTICIPANTE
                </th>

                {jogos.map((jogo) => (
                  <th
                    key={jogo.id}
                    className="min-w-[110px] border-b border-zinc-200 bg-zinc-50 px-3 py-4 text-center dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        {jogo.homeTeam?.tla}
                      </span>
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">-</span>
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        {jogo.awayTeam?.tla}
                      </span>
                    </div>
                  </th>
                ))}

                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-sm font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                  PONTOS
                </th>
              </tr>
            </thead>

            <tbody>
              {participantes.map((participante) => {
                const isMinhaLinha =
                  minhaLinhaId && String(minhaLinhaId) === String(participante.id);
                const podeEditar =
                  podeEditarMinhaLinha && isMinhaLinha;
                const minhaLinhaSalva = isMinhaLinha && rodadaJaSalva;
                const minhaLinhaEncerrada =
                  isMinhaLinha && !rodadaJaSalva && rodadaAnterior;
                const badgeBloqueioClasses = minhaLinhaSalva
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : minhaLinhaEncerrada
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
                const IconeLinhaBloqueada = minhaLinhaSalva ? CircleCheck : Lock;

                return (
                  <tr key={participante.id}>
                    <td className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                          {participante.name}
                        </span>
                        {!podeEditar && (
                          <span
                            className={`inline-flex items-center justify-center rounded-full p-1 ${badgeBloqueioClasses}`}
                            title={
                              minhaLinhaSalva
                                ? "Seus palpites foram salvos"
                                : "Palpites bloqueados"
                            }
                          >
                            <IconeLinhaBloqueada className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {jogos.map((jogo) => {
                      const valor = palpites[participante.id]?.[jogo.id] || "";

                      return (
                        <td
                          key={jogo.id}
                          className="border-b border-zinc-100 px-2 py-3 text-center dark:border-zinc-800"
                        >
                          {podeEditar ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              placeholder="0-0"
                              value={valor}
                              onChange={(e) =>
                                handlePalpiteChange(
                                  participante.id,
                                  jogo.id,
                                  e.target.value
                                )
                              }
                              className={`w-[70px] rounded-xl border px-2 py-2 text-center text-sm font-semibold outline-none transition ${classeCelula(
                                valor,
                                jogo,
                                true
                              )}`}
                            />
                          ) : (
                            renderCelulaBloqueada(valor, jogo, minhaLinhaSalva)
                          )}
                        </td>
                      );
                    })}

                    <td className="border-b border-zinc-100 px-4 py-4 text-center text-lg font-black text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
                      {totalParticipante(participante.id)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 border-t-2 border-violet-400 bg-violet-50 px-4 py-4 text-left text-sm font-black uppercase tracking-wide text-violet-900 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100">
                  Placar final
                </td>

                {jogos.map((jogo) => (
                  <td
                    key={jogo.id}
                    className="border-t-2 border-violet-400 bg-zinc-50 px-3 py-4 text-center text-lg font-bold text-zinc-800 dark:border-violet-500 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {placarFinal(jogo)}
                  </td>
                ))}

                <td className="border-t-2 border-violet-400 bg-zinc-50 px-4 py-4 dark:border-violet-500 dark:bg-zinc-950" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!user && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Você precisa estar logado para editar seus palpites.
        </div>
      )}
    </section>
  );
}
