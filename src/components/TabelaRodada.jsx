import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getFixturesByRound,
  getRounds,
  getSeasonFixtures,
  getStandings,
} from "../services/api";

const TODAS_RODADAS = "todas";
const RODADAS_FALLBACK = Array.from({ length: 38 }, (_, i) => i + 1);
const JOGOS_VAZIOS = [];
const JOGOS_POR_PAGINA = 20;
const nomeTime = (time) => time?.shortName || time?.name || time?.tla || "Time";

const buscarJogosDaRodada = async (rodada) => {
  const data = await getFixturesByRound(rodada);

  return (data.matches || []).map((jogo) => ({
    ...jogo,
    rodada: jogo.matchday || rodada,
  }));
};

const normalizarJogos = (jogos) =>
  (jogos || []).map((jogo) => ({
    ...jogo,
    rodada: jogo.matchday || jogo.rodada,
  }));

const buscarJogosDaTemporada = async () => {
  const data = await getSeasonFixtures();

  return ordenarJogosPorRodada(normalizarJogos(data.matches));
};

const ordenarJogosPorRodada = (jogos) =>
  [...jogos].sort((jogoA, jogoB) => {
    const rodadaA = jogoA.rodada || 0;
    const rodadaB = jogoB.rodada || 0;

    if (rodadaA !== rodadaB) return rodadaA - rodadaB;

    return new Date(jogoA.utcDate) - new Date(jogoB.utcDate);
  });

export const TabelaRodada = () => {
  const [resultadoRodada, setResultadoRodada] = useState({
    rodada: "",
    jogos: [],
    erro: "",
  });
  const [times, setTimes] = useState([]);
  const [rodadas, setRodadas] = useState(RODADAS_FALLBACK);
  const [rodadaSelecionada, setRodadaSelecionada] = useState("1");
  const [timeSelecionado, setTimeSelecionado] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const loading = resultadoRodada.rodada !== rodadaSelecionada;
  const erro = loading ? "" : resultadoRodada.erro;
  const jogos = loading ? JOGOS_VAZIOS : resultadoRodada.jogos;
  const mostrandoTodasRodadas = rodadaSelecionada === TODAS_RODADAS;

  useEffect(() => {
    let ativo = true;

    const carregarRodadas = async () => {
      try {
        const data = await getRounds();
        if (!ativo) return;

        const matchdays = data.matchdays?.length ? data.matchdays : RODADAS_FALLBACK;
        setRodadas(matchdays);
      } catch (err) {
        if (!ativo) return;

        console.error(err);
        setRodadas(RODADAS_FALLBACK);
      }
    };

    carregarRodadas();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarJogos = async () => {
      try {
        const jogosCarregados =
          rodadaSelecionada === TODAS_RODADAS
            ? await buscarJogosDaTemporada()
            : await buscarJogosDaRodada(rodadaSelecionada);

        if (!ativo) return;

        setResultadoRodada({
          rodada: rodadaSelecionada,
          jogos: jogosCarregados,
          erro: "",
        });
      } catch (err) {
        if (!ativo) return;

        console.error(err);
        setResultadoRodada({
          rodada: rodadaSelecionada,
          jogos: [],
          erro: "Não foi possível carregar os jogos.",
        });
      }
    };

    carregarJogos();

    return () => {
      ativo = false;
    };
  }, [rodadaSelecionada]);

  useEffect(() => {
    let ativo = true;

    const carregarTimes = async () => {
      try {
        const data = await getStandings();
        if (!ativo) return;

        const tabela = data.standings?.[0]?.table || [];
        setTimes(tabela.map((item) => item.team).filter(Boolean));
      } catch (err) {
        if (!ativo) return;

        console.error(err);
      }
    };

    carregarTimes();

    return () => {
      ativo = false;
    };
  }, []);

  const timesDisponiveis = useMemo(() => {
    const mapaTimes = new Map();

    [...times, ...jogos.flatMap((jogo) => [jogo.homeTeam, jogo.awayTeam])]
      .filter((time) => time?.id)
      .forEach((time) => {
        mapaTimes.set(String(time.id), time);
      });

    return Array.from(mapaTimes.values()).sort((timeA, timeB) =>
      nomeTime(timeA).localeCompare(nomeTime(timeB), "pt-BR")
    );
  }, [jogos, times]);

  const jogosFiltrados = useMemo(() => {
    if (!timeSelecionado) return jogos;

    return jogos.filter((jogo) => {
      const homeTeamId = String(jogo.homeTeam?.id || "");
      const awayTeamId = String(jogo.awayTeam?.id || "");

      return homeTeamId === timeSelecionado || awayTeamId === timeSelecionado;
    });
  }, [jogos, timeSelecionado]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(jogosFiltrados.length / JOGOS_POR_PAGINA)
  );
  const paginaAtualSegura = Math.min(paginaAtual, totalPaginas);
  const inicioPagina = (paginaAtualSegura - 1) * JOGOS_POR_PAGINA;
  const fimPagina = inicioPagina + JOGOS_POR_PAGINA;
  const jogosPaginados = jogosFiltrados.slice(inicioPagina, fimPagina);
  const primeiroItem = jogosFiltrados.length === 0 ? 0 : inicioPagina + 1;
  const ultimoItem = Math.min(fimPagina, jogosFiltrados.length);

  const formatarData = (dataIso) => {
    if (!dataIso) return "-";

    return new Date(dataIso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarHora = (dataIso) => {
    if (!dataIso) return "-";

    return new Date(dataIso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const traduzirStatus = (status) => {
    const mapa = {
      SCHEDULED: "Agendado",
      TIMED: "Agendado",
      IN_PLAY: "Ao vivo",
      PAUSED: "Intervalo",
      FINISHED: "Encerrado",
      POSTPONED: "Adiado",
      CANCELED: "Cancelado",
    };

    return mapa[status] || status;
  };

  const renderCentroPartida = (jogo) => {
    const home = jogo.score?.fullTime?.home;
    const away = jogo.score?.fullTime?.away;

    if (jogo.status === "FINISHED") {
      return (
        <span className="inline-flex min-w-[64px] items-center justify-center rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
          {home} x {away}
        </span>
      );
    }

    if (jogo.status === "IN_PLAY" || jogo.status === "PAUSED") {
      return (
        <span className="inline-flex min-w-[64px] items-center justify-center rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
          {home ?? 0} x {away ?? 0}
        </span>
      );
    }

    return (
      <span className="inline-flex min-w-[64px] items-center justify-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
        VS
      </span>
    );
  };

  if (loading) {
    return (
      <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-zinc-500">Carregando jogos...</p>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="w-full rounded-[28px] border border-red-200 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-red-500">{erro}</p>
      </section>
    );
  }

  return (
    <section className="h-full w-full">
      <div className="flex h-full min-h-[640px] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Premier League
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
              Jogos por rodada
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
            <div className="flex items-center gap-3">
              {/* <label htmlFor="rodada" className="text-sm font-medium text-zinc-600">
                Rodada
              </label> */}

              <select
                id="rodada"
                value={rodadaSelecionada}
                onChange={(e) => {
                  setRodadaSelecionada(e.target.value);
                  setPaginaAtual(1);
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-400"
              >
                <option value={TODAS_RODADAS}>Todas</option>
                {rodadas.map((rodada) => (
                  <option key={rodada} value={rodada}>
                    Rodada {rodada}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* <label htmlFor="time" className="text-sm font-medium text-zinc-600">
                Time
              </label> */}

              <select
                id="time"
                value={timeSelecionado}
                onChange={(e) => {
                  setTimeSelecionado(e.target.value);
                  setPaginaAtual(1);
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-400 sm:w-[190px]"
              >
                <option value="">Todos os times</option>
                {timesDisponiveis.map((time) => (
                  <option key={time.id} value={time.id}>
                    {nomeTime(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4 space-y-6">
  {jogosPaginados.reduce((acc, jogo) => {
    const data = formatarData(jogo.utcDate);
    if (!acc[data]) acc[data] = [];
    acc[data].push(jogo);
    return acc;
  }, {}) &&
    Object.entries(
      jogosPaginados.reduce((acc, jogo) => {
        const data = formatarData(jogo.utcDate);
        if (!acc[data]) acc[data] = [];
        acc[data].push(jogo);
        return acc;
      }, {})
    ).map(([data, jogosDoDia]) => (
      <div key={data}>
        {/* DATA */}
        <div className="mb-3 text-sm font-semibold text-zinc-500">
          📅 {data}
        </div>

        {/* LISTA DE JOGOS */}
        <div className="space-y-3">
          {jogosDoDia.map((jogo) => {
            const home = jogo.score?.fullTime?.home;
            const away = jogo.score?.fullTime?.away;

            return (
              <div
                key={jogo.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
              >
                {/* STATUS + RODADA */}
                <div className="flex flex-col gap-1 min-w-[90px]">
                  <span
                    className={`text-[10px] font-bold px-2 py-[2px] rounded-full w-fit ${
                      jogo.status === "FINISHED"
                        ? "bg-green-100 text-green-700"
                        : jogo.status === "IN_PLAY"
                        ? "bg-red-100 text-red-600"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {traduzirStatus(jogo.status)}
                  </span>

                  <span className="text-xs text-zinc-400">
                    Rodada {jogo.rodada}
                  </span>
                </div>

                {/* TIME CASA */}
                <div className="flex items-center gap-2 w-[120px] justify-end">
                  <span className="text-sm font-semibold">
                    {nomeTime(jogo.homeTeam)}
                  </span>
                  <img
                    src={jogo.homeTeam?.crest}
                    className="h-6 w-6"
                  />
                </div>

                {/* PLACAR */}
                <div className="flex flex-col items-center min-w-[70px]">
                  <span className="text-lg font-bold text-purple-600">
                    {jogo.status === "FINISHED"
                      ? `${home} - ${away}`
                      : "VS"}
                  </span>

                  <span className="text-[11px] text-zinc-400">
                    {formatarHora(jogo.utcDate)}
                  </span>
                </div>

                {/* TIME FORA */}
                <div className="flex items-center gap-2 w-[120px]">
                  <img
                    src={jogo.awayTeam?.crest}
                    className="h-6 w-6"
                  />
                  <span className="text-sm font-semibold">
                    {nomeTime(jogo.awayTeam)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}

  {jogosFiltrados.length === 0 && (
    <div className="text-center text-sm text-zinc-500 py-10">
      Nenhum jogo encontrado.
    </div>
  )}
</div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {primeiroItem}-{ultimoItem} de {jogosFiltrados.length} jogos
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaginaAtual(Math.max(1, paginaAtualSegura - 1))}
              disabled={paginaAtualSegura === 1}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <span className="inline-flex h-9 min-w-[74px] items-center justify-center rounded-xl bg-zinc-100 px-3 text-sm font-semibold text-zinc-700">
              {paginaAtualSegura}/{totalPaginas}
            </span>

            <button
              type="button"
              onClick={() =>
                setPaginaAtual(Math.min(totalPaginas, paginaAtualSegura + 1))
              }
              disabled={paginaAtualSegura === totalPaginas}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
