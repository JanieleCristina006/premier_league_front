import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircleCheck, Lock, Save,Trophy } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";

import {
  getFixturesByRound,
  getRounds,
  getSeasonFixtures,
  SEASON,
} from "../services/api";

const RODADA_INICIAL_BOLAO = 35;
const RODADA_FINAL_BOLAO = 38;
const RODADAS_FALLBACK = Array.from(
  { length: RODADA_FINAL_BOLAO - RODADA_INICIAL_BOLAO + 1 },
  (_, i) => RODADA_INICIAL_BOLAO + i
);
const STATUS_ENCERRADOS = new Set([
  "FINISHED",
  "AWARDED",
  "CANCELED",
  "CANCELLED",
]);

const nomeParticipanteVisivel = (participante) => {
  const nome = participante?.name?.trim();

  if (!nome || nome.includes("@")) {
    return "Participante";
  }

  return nome;
};

const numeroInteiroSeguro = (valor) => {
  const numero = Number(valor);

  return Number.isInteger(numero) ? numero : 0;
};

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

const filtrarRodadasDoBolao = (rodadas = []) => {
  const rodadasFiltradas = rodadas
    .map(Number)
    .filter(
      (rodada) =>
        Number.isInteger(rodada) &&
        rodada >= RODADA_INICIAL_BOLAO &&
        rodada <= RODADA_FINAL_BOLAO
    );

  return rodadasFiltradas.length ? rodadasFiltradas : RODADAS_FALLBACK;
};

const limitarRodadaDoBolao = (rodada) => {
  const rodadaNumero = Number(rodada);

  if (!Number.isInteger(rodadaNumero)) {
    return String(RODADA_INICIAL_BOLAO);
  }

  return String(
    Math.min(
      Math.max(rodadaNumero, RODADA_INICIAL_BOLAO),
      RODADA_FINAL_BOLAO
    )
  );
};

const formatarPalpite = (valor) => {
  const numeros = valor.replace(/\D/g, "").slice(0, 2);

  if (numeros.length <= 1) return numeros;
  return `${numeros[0]}-${numeros[1]}`;
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

const criarMapaPalpites = (dados = []) => {
  const mapa = {};

  dados.forEach((item) => {
    if (!mapa[item.participant_id]) {
      mapa[item.participant_id] = {};
    }

    mapa[item.participant_id][item.match_id] =
      `${item.home_goals}-${item.away_goals}`;
  });

  return mapa;
};

const calcularResumoParticipante = (participanteId, palpitesPorParticipante, jogos) => {
  return jogos.reduce(
    (resumo, jogo) => {
      const palpite = palpitesPorParticipante[participanteId]?.[jogo.id] || "";
      const tipo = tipoAcerto(palpite, jogo);

      if (tipo === "cravada") {
        return {
          pontos: resumo.pontos + 3,
          cravadas: resumo.cravadas + 1,
        };
      }

      if (tipo === "vencedor") {
        return {
          ...resumo,
          pontos: resumo.pontos + 1,
        };
      }

      return resumo;
    },
    { pontos: 0, cravadas: 0 }
  );
};

const criarPayloadTotalPontos = (participantes, palpitesPorParticipante, jogos, rodada) =>
  participantes.map((participante) => {
    const resumo = calcularResumoParticipante(
      participante.id,
      palpitesPorParticipante,
      jogos
    );

    return {
      participant_id: participante.id,
      round: Number(rodada),
      season: SEASON,
      pontos: resumo.pontos,
      cravadas: resumo.cravadas,
      updated_at: new Date().toISOString(),
    };
  });

const chaveTotalPontos = (item) =>
  `${item.participant_id}-${item.round}-${item.season}`;

const mesclarTotais = (totaisAtuais, novosTotais) => {
  const mapa = new Map(
    totaisAtuais.map((item) => [chaveTotalPontos(item), item])
  );

  novosTotais.forEach((item) => {
    mapa.set(chaveTotalPontos(item), item);
  });

  return Array.from(mapa.values());
};

export default function TabelaBolao() {
  const [rodadaSelecionada, setRodadaSelecionada] = useState(
    String(RODADA_INICIAL_BOLAO)
  );
  const [jogos, setJogos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [user, setUser] = useState(null);
  const [meuParticipante, setMeuParticipante] = useState(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroJogos, setErroJogos] = useState("");
  const [erroTotais, setErroTotais] = useState("");
  const [rodadas, setRodadas] = useState(RODADAS_FALLBACK);
  const [rodadaAtual, setRodadaAtual] = useState(null);
  const [rodadasSalvas, setRodadasSalvas] = useState(() => new Set());
  const [totaisRodadas, setTotaisRodadas] = useState([]);
  const [rodadaPalpitesCarregada, setRodadaPalpitesCarregada] = useState("");
  const [palpitesSujo, setPalpitesSujo] = useState(false);

  useEffect(() => {
    const carregarRodadas = async () => {
      try {
        const data = await getRounds();
        const matchdays = filtrarRodadasDoBolao(
          data.matchdays?.length ? data.matchdays : RODADAS_FALLBACK
        );
        setRodadas(matchdays);

        const rodadaAtualDaApi = extrairRodadaAtual(data);

        if (rodadaAtualDaApi) {
          setRodadaAtual(rodadaAtualDaApi);
          setRodadaSelecionada((rodadaSelecionadaAtual) => {
            const selecionada = Number(rodadaSelecionadaAtual);

            return limitarRodadaDoBolao(
              selecionada >= rodadaAtualDaApi
                ? rodadaSelecionadaAtual
                : rodadaAtualDaApi
            );
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

          return limitarRodadaDoBolao(
            selecionada >= rodadaCalculada
              ? rodadaSelecionadaAtual
              : rodadaCalculada
          );
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
    let ativo = true;

    const carregarTotais = async () => {
      const { data, error } = await supabase
        .from("total_pontos")
        .select("*")
        .eq("season", SEASON);

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar total de pontos:", error);
        setErroTotais("Nao foi possivel carregar a tabela total_pontos.");
        return;
      }

      setTotaisRodadas(data || []);
      setErroTotais("");
    };

    carregarTotais();

    return () => {
      ativo = false;
    };
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
    let ativo = true;

    const carregarPalpites = async () => {
      setRodadaPalpitesCarregada("");
      setPalpitesSujo(false);

      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("round", Number(rodadaSelecionada))
        .eq("season", SEASON);

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar palpites:", error);
        return;
      }

      setPalpites(criarMapaPalpites(data || []));
      setRodadaPalpitesCarregada(rodadaSelecionada);

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

    return () => {
      ativo = false;
    };
  }, [meuParticipante, rodadaSelecionada]);

  const handlePalpiteChange = (participanteId, jogoId, valor) => {
    const formatado = formatarPalpite(valor);

    setPalpitesSujo(true);
    setPalpites((prev) => ({
      ...prev,
      [participanteId]: {
        ...prev[participanteId],
        [jogoId]: formatado,
      },
    }));
  };

  const resumoParticipante = (participanteId) =>
    calcularResumoParticipante(participanteId, palpites, jogos);

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

  const salvarTotalPontos = useCallback(async (payload) => {
    if (payload.length === 0) return true;

    const { data, error } = await supabase
      .from("total_pontos")
      .upsert(payload, {
        onConflict: "participant_id,round,season",
      })
      .select("*");

    if (error) {
      console.error("Erro ao salvar total de pontos:", error);
      setErroTotais("Nao foi possivel salvar a tabela total_pontos.");
      return false;
    }

    setTotaisRodadas((prev) => mesclarTotais(prev, data?.length ? data : payload));
    setErroTotais("");
    return true;
  }, []);

  useEffect(() => {
    if (!user || participantes.length === 0) return;

    let ativo = true;

    const sincronizarTotais = async () => {
      const { data: palpitesSalvos, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("season", SEASON)
        .in("round", RODADAS_FALLBACK);

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar palpites para total_pontos:", error);
        return;
      }

      const palpitesPorRodada = new Map();

      (palpitesSalvos || []).forEach((palpite) => {
        const rodada = Number(palpite.round);

        if (!Number.isInteger(rodada)) return;

        if (!palpitesPorRodada.has(rodada)) {
          palpitesPorRodada.set(rodada, []);
        }

        palpitesPorRodada.get(rodada).push(palpite);
      });

      const jogosPorRodada = await Promise.all(
        RODADAS_FALLBACK.map(async (rodada) => {
          try {
            const data = await getFixturesByRound(rodada);
            return { rodada, jogos: data.matches || [] };
          } catch (error) {
            console.error(`Erro ao buscar jogos da rodada ${rodada}:`, error);
            return { rodada, jogos: [] };
          }
        })
      );

      if (!ativo) return;

      const payload = jogosPorRodada.flatMap(({ rodada, jogos: jogosRodada }) =>
        jogosRodada.length === 0
          ? []
          : criarPayloadTotalPontos(
              participantes,
              criarMapaPalpites(palpitesPorRodada.get(rodada) || []),
              jogosRodada,
              rodada
            )
      );

      await salvarTotalPontos(payload);
    };

    sincronizarTotais();

    return () => {
      ativo = false;
    };
  }, [participantes, salvarTotalPontos, user]);

  useEffect(() => {
    if (
      !user ||
      participantes.length === 0 ||
      loading ||
      erroJogos ||
      jogos.length === 0 ||
      palpitesSujo ||
      rodadaPalpitesCarregada !== rodadaSelecionada
    ) {
      return;
    }

    const sincronizarRodadaSelecionada = async () => {
      const payload = criarPayloadTotalPontos(
        participantes,
        palpites,
        jogos,
        rodadaSelecionada
      );

      await salvarTotalPontos(payload);
    };

    sincronizarRodadaSelecionada();
  }, [
    erroJogos,
    jogos,
    loading,
    palpites,
    palpitesSujo,
    participantes,
    rodadaPalpitesCarregada,
    rodadaSelecionada,
    salvarTotalPontos,
    user,
  ]);

  const rankingTotalPontos = useMemo(() => {
    const mapa = new Map();

    participantes.forEach((participante) => {
      mapa.set(String(participante.id), {
        participante,
        pontos: numeroInteiroSeguro(participante.pontos_rodada_anterior),
        cravadas: numeroInteiroSeguro(participante.cravadas_rodada_anterior),
      });
    });

    totaisRodadas.forEach((item) => {
      const key = String(item.participant_id);
      const linha = mapa.get(key);

      if (!linha) return;

      linha.pontos += Number(item.pontos || 0);
      linha.cravadas += Number(item.cravadas || 0);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.cravadas !== a.cravadas) return b.cravadas - a.cravadas;

      return nomeParticipanteVisivel(a.participante).localeCompare(
        nomeParticipanteVisivel(b.participante),
        "pt-BR"
      );
    });
  }, [participantes, totaisRodadas]);

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
      setPalpitesSujo(false);
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
        <table className="w-full min-w-[1180px] border-separate border-spacing-0">
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
                CRAVADAS
              </th>
              <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-sm font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                PONTOS
              </th>
            </tr>
          </thead>

          <tbody>
            {participantes.map((participante) => {
              const isMinhaLinha =
                minhaLinhaId && String(minhaLinhaId) === String(participante.id);
              const podeEditar = podeEditarMinhaLinha && isMinhaLinha;
              const minhaLinhaSalva = isMinhaLinha && rodadaJaSalva;
              const minhaLinhaEncerrada =
                isMinhaLinha && !rodadaJaSalva && rodadaAnterior;

              const badgeBloqueioClasses = minhaLinhaSalva
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                : minhaLinhaEncerrada
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

              const IconeLinhaBloqueada = minhaLinhaSalva ? CircleCheck : Lock;
              const resumo = resumoParticipante(participante.id);

              return (
                <tr key={participante.id}>
                  <td className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {nomeParticipanteVisivel(participante)}
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

                  <td className="border-b border-zinc-100 px-4 py-4 text-center text-lg font-black text-emerald-600 dark:border-zinc-800 dark:text-emerald-300">
                    {resumo.cravadas}
                  </td>

                  <td className="border-b border-zinc-100 px-4 py-4 text-center text-lg font-black text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
                    {resumo.pontos}
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
              <td className="border-t-2 border-violet-400 bg-zinc-50 px-4 py-4 dark:border-violet-500 dark:bg-zinc-950" />
            </tr>
          </tfoot>
        </table>
      </div>
    )}

    {participantes.length > 0 && (
      <div className="mt-6 mb-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
              Ranking
            </p>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
              Total pontos
            </h3>
          </div>

          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Rodadas {RODADA_INICIAL_BOLAO}-{RODADA_FINAL_BOLAO}
          </span>
        </div>

        {erroTotais && (
          <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            {erroTotais}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Pos
                </th>

                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Participante
                </th>

                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Pontos
                </th>

                <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Cravadas
                </th>
              </tr>
            </thead>

            <tbody>
              {rankingTotalPontos.map((linha, index) => (
                <tr key={linha.participante.id}>
                  <td className="border-b border-zinc-100 px-4 py-3 text-sm font-bold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {index + 1}
                  </td>

                  <td className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      )}

                      {nomeParticipanteVisivel(linha.participante)}
                    </div>
                  </td>

                  <td className="border-b border-zinc-100 px-4 py-3 text-center text-base font-black text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                    {linha.pontos}
                  </td>

                  <td className="border-b border-zinc-100 px-4 py-3 text-center text-base font-black text-emerald-600 dark:border-zinc-800 dark:text-emerald-300">
                    {linha.cravadas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
