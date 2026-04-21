import React, { useEffect, useMemo, useState } from "react";
import { Lock, Save } from "lucide-react";
import { supabase } from "../lib/supabase";

const SEASON = 2025;

export default function TabelaBolao() {
  const [rodadaSelecionada, setRodadaSelecionada] = useState("1");
  const [jogos, setJogos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [user, setUser] = useState(null);
  const [meuParticipante, setMeuParticipante] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const rodadas = Array.from({ length: 38 }, (_, i) => i + 1);

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
        const response = await fetch(
          `https://futebolinglesbrasil.vps8317.panel.icontainer.cloud/api/fixtures/round/${rodadaSelecionada}?season=${SEASON}`
        );
        const data = await response.json();
        setJogos(data.matches || []);
      } catch (error) {
        console.error("Erro ao buscar jogos:", error);
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
    };

    carregarPalpites();
  }, [rodadaSelecionada]);

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

    if (!podeEditar && !palpiteTexto) {
      return "bg-zinc-100 text-zinc-400 border-zinc-200";
    }

    if (tipo === "cravada") {
      return "bg-emerald-500 text-white border-emerald-500";
    }

    if (tipo === "vencedor") {
      return "bg-sky-500 text-white border-sky-500";
    }

    return "bg-white text-zinc-800 border-zinc-200";
  };

  const placarFinal = (jogo) => {
    const casa = jogo.score?.fullTime?.home;
    const fora = jogo.score?.fullTime?.away;

    if (casa == null || fora == null) return "-";
    return `${casa}-${fora}`;
  };

  const salvarMeusPalpites = async () => {
    if (!meuParticipante) return;

    setSalvando(true);
    setMensagem("");

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

      if (payload.length === 0) {
        setMensagem("Preencha pelo menos um palpite válido.");
        return;
      }

      const { error } = await supabase
        .from("predictions")
        .upsert(payload, {
          onConflict: "participant_id,match_id,season",
        });

      if (error) {
        console.error("Erro ao salvar palpites:", error);
        setMensagem("Erro ao salvar palpites.");
        return;
      }

      setMensagem("Palpites salvos com sucesso.");
    } finally {
      setSalvando(false);
    }
  };

  const minhaLinhaId = meuParticipante?.id ?? null;

  const tabelaPronta = useMemo(
    () => !loading && participantes.length > 0,
    [loading, participantes.length]
  );

  if (loading && jogos.length === 0) {
    return (
      <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-zinc-500">Carregando tabela...</p>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Bolão
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
            Palpites da rodada
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-zinc-700">
            <span className="h-4 w-4 rounded-md bg-emerald-500" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span>CRAVADA +3</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-zinc-700">
            <span className="h-4 w-4 rounded-md bg-sky-500" />
            <span className="h-3 w-3 rounded-full bg-sky-400" />
            <span>VENCEDOR +1</span>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="rodada" className="text-sm font-medium text-zinc-600">
              Rodada
            </label>

            <select
              id="rodada"
              value={rodadaSelecionada}
              onChange={(e) => setRodadaSelecionada(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 outline-none"
            >
              {rodadas.map((rodada) => (
                <option key={rodada} value={rodada}>
                  Rodada {rodada}
                </option>
              ))}
            </select>
          </div>

          {meuParticipante && (
            <button
              onClick={salvarMeusPalpites}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar palpites"}
            </button>
          )}
        </div>
      </div>

      {mensagem && (
        <div className="mb-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          {mensagem}
        </div>
      )}

      {tabelaPronta && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-b border-zinc-200 bg-zinc-50 px-4 py-4 text-left text-sm font-bold text-zinc-800">
                  PARTICIPANTE
                </th>

                {jogos.map((jogo) => (
                  <th
                    key={jogo.id}
                    className="min-w-[110px] border-b border-zinc-200 bg-zinc-50 px-3 py-4 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-bold text-zinc-800">
                        {jogo.homeTeam?.tla}
                      </span>
                      <span className="text-xs font-medium text-zinc-400">-</span>
                      <span className="text-sm font-bold text-zinc-800">
                        {jogo.awayTeam?.tla}
                      </span>
                    </div>
                  </th>
                ))}

                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-sm font-bold text-zinc-800">
                  PONTOS
                </th>
              </tr>
            </thead>

            <tbody>
              {participantes.map((participante) => {
                const podeEditar =
                  minhaLinhaId && String(minhaLinhaId) === String(participante.id);

                return (
                  <tr key={participante.id}>
                    <td className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-800">
                          {participante.name}
                        </span>

                        {!podeEditar && (
                          <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 p-1 text-zinc-500">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {jogos.map((jogo) => {
                      const valor = palpites[participante.id]?.[jogo.id] || "";

                      return (
                        <td
                          key={jogo.id}
                          className="border-b border-zinc-100 px-2 py-3 text-center"
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
                              className={`w-[64px] rounded-xl border px-2 py-2 text-center text-sm font-semibold outline-none transition ${classeCelula(
                                valor,
                                jogo,
                                podeEditar
                              )}`}
                            />
                          ) : (
                            <div className="flex items-center justify-center">
                              <div
                                className={`inline-flex min-h-[40px] min-w-[64px] items-center justify-center rounded-xl border px-2 py-2 text-center text-sm font-semibold ${classeCelula(
                                  valor,
                                  jogo,
                                  podeEditar
                                )}`}
                              >
                                {valor || <Lock className="h-4 w-4 text-zinc-400" />}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="border-b border-zinc-100 px-4 py-4 text-center text-lg font-black text-zinc-800">
                      {totalParticipante(participante.id)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 border-t-2 border-violet-400 bg-violet-50 px-4 py-4 text-left text-sm font-black uppercase tracking-wide text-violet-900">
                  Placar final
                </td>

                {jogos.map((jogo) => (
                  <td
                    key={jogo.id}
                    className="border-t-2 border-violet-400 bg-zinc-50 px-3 py-4 text-center text-lg font-bold text-zinc-800"
                  >
                    {placarFinal(jogo)}
                  </td>
                ))}

                <td className="border-t-2 border-violet-400 bg-zinc-50 px-4 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!user && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Você precisa estar logado para editar seus palpites.
        </div>
      )}
    </section>
  );
}