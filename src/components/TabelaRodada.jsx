import React, { useEffect, useMemo, useState } from "react";

const SEASON = 2025;
const TODAS_RODADAS = "todas";
const RODADAS = Array.from({ length: 38 }, (_, i) => i + 1);
const JOGOS_VAZIOS = [];
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://futebolinglesbrasil.vps8317.panel.icontainer.cloud";
const nomeTime = (time) => time?.shortName || time?.name || time?.tla || "Time";

const buscarJogosDaRodada = async (rodada) => {
  const response = await fetch(
    `${API_BASE_URL}/api/fixtures/round/${rodada}?season=${SEASON}`
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar jogos");
  }

  const data = await response.json();

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
  const response = await fetch(`${API_BASE_URL}/api/fixtures?season=${SEASON}`);

  if (!response.ok) {
    throw new Error("Erro ao buscar jogos da temporada");
  }

  const data = await response.json();

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
  const [rodadaSelecionada, setRodadaSelecionada] = useState("1");
  const [timeSelecionado, setTimeSelecionado] = useState("");

  const loading = resultadoRodada.rodada !== rodadaSelecionada;
  const erro = loading ? "" : resultadoRodada.erro;
  const jogos = loading ? JOGOS_VAZIOS : resultadoRodada.jogos;
  const mostrandoTodasRodadas = rodadaSelecionada === TODAS_RODADAS;

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
    fetch(`${API_BASE_URL}/api/standings?season=${SEASON}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Erro ao buscar times");
        }
        return res.json();
      })
      .then((data) => {
        const tabela = data.standings?.[0]?.table || [];
        setTimes(tabela.map((item) => item.team).filter(Boolean));
      })
      .catch((err) => {
        console.error(err);
      });
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
    <section className="w-full">
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
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
              <label htmlFor="rodada" className="text-sm font-medium text-zinc-600">
                Rodada
              </label>

              <select
                id="rodada"
                value={rodadaSelecionada}
                onChange={(e) => setRodadaSelecionada(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-400"
              >
                <option value={TODAS_RODADAS}>Todas</option>
                {RODADAS.map((rodada) => (
                  <option key={rodada} value={rodada}>
                    Rodada {rodada}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="time" className="text-sm font-medium text-zinc-600">
                Time
              </label>

              <select
                id="time"
                value={timeSelecionado}
                onChange={(e) => setTimeSelecionado(e.target.value)}
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                {mostrandoTodasRodadas && (
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Rodada
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Partida
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Estádio
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {jogosFiltrados.map((jogo) => (
                <tr
                  key={jogo.id}
                  className="border-b border-zinc-100 transition hover:bg-zinc-50/80"
                >
                  {mostrandoTodasRodadas && (
                    <td className="px-4 py-4 text-sm font-bold text-zinc-700">
                      Rodada {jogo.rodada || jogo.matchday || "-"}
                    </td>
                  )}

                  <td className="px-4 py-4 text-sm font-medium text-zinc-700">
                    {formatarData(jogo.utcDate)}
                  </td>

                  <td className="px-4 py-4 text-sm font-medium text-zinc-700">
                    {formatarHora(jogo.utcDate)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex min-w-[180px] items-center justify-end gap-2">
                        <span className="text-sm font-semibold text-zinc-800">
                          {jogo.homeTeam?.shortName || jogo.homeTeam?.name}
                        </span>
                        <img
                          src={jogo.homeTeam?.crest}
                          alt={jogo.homeTeam?.name}
                          className="h-7 w-7 object-contain"
                        />
                      </div>

                      {renderCentroPartida(jogo)}

                      <div className="flex min-w-[180px] items-center gap-2">
                        <img
                          src={jogo.awayTeam?.crest}
                          alt={jogo.awayTeam?.name}
                          className="h-7 w-7 object-contain"
                        />
                        <span className="text-sm font-semibold text-zinc-800">
                          {jogo.awayTeam?.shortName || jogo.awayTeam?.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-zinc-600">
                    {jogo.venue || "-"}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${
                        jogo.status === "IN_PLAY"
                          ? "bg-red-500"
                          : jogo.status === "PAUSED"
                          ? "bg-amber-500"
                          : jogo.status === "FINISHED"
                          ? "bg-zinc-900"
                          : "bg-zinc-500"
                      }`}
                    >
                      {traduzirStatus(jogo.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {jogosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={mostrandoTodasRodadas ? 6 : 5}
                    className="px-4 py-10 text-center text-sm text-zinc-500"
                  >
                    Nenhum jogo encontrado para esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
