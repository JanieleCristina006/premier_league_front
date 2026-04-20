import React, { useEffect, useState } from "react";

export const TabelaRodada = () => {
  const [jogos, setJogos] = useState([]);
  const [rodadaSelecionada, setRodadaSelecionada] = useState("1");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const rodadas = Array.from({ length: 38 }, (_, i) => i + 1);

  useEffect(() => {
    setLoading(true);
    setErro("");

    fetch(
      `http://futebolinglesbrasil.vps8317.panel.icontainer.cloud/api/fixtures/round/${rodadaSelecionada}?season=2025`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Erro ao buscar jogos");
        }
        return res.json();
      })
      .then((data) => {
        setJogos(data.matches || []);
      })
      .catch((err) => {
        console.error(err);
        setErro("Não foi possível carregar os jogos.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rodadaSelecionada]);

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
              {rodadas.map((rodada) => (
                <option key={rodada} value={rodada}>
                  Rodada {rodada}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
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
              {jogos.map((jogo) => (
                <tr
                  key={jogo.id}
                  className="border-b border-zinc-100 transition hover:bg-zinc-50/80"
                >
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

              {jogos.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-sm text-zinc-500"
                  >
                    Nenhum jogo encontrado para essa rodada.
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