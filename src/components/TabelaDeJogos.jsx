import React, { useEffect, useState } from "react";
import { getStandings } from "../services/api";

export default function Classificacao() {
  const [times, setTimes] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getStandings()
      .then((data) => {
        setTimes(data.standings?.[0]?.table || []);
        setErro("");
      })
      .catch((err) => {
        setTimes([]);
        setErro("Nao foi possivel carregar a classificacao.");
        console.error("Erro ao buscar classificação:", err);
      });
  }, []);

  return (
    <section className="h-full w-full">
      <div className="h-full overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
            Premier League
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Classificação
          </h2>
        </div>

        {erro && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {erro}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/70">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Pos
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Clube
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  PTS
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  J
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  V
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  E
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  D
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  SG
                </th>
              </tr>
            </thead>

            <tbody>
              {times.map((time, index) => {
                const isTop5 = index < 5;
                const isBottom3 = index >= times.length - 3;

                return (
                  <tr
                    key={time.team.id}
                    className="border-b border-zinc-100 transition hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {isTop5 && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                        )}
                        {!isTop5 && (
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isBottom3 ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          />
                        )}
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {time.position}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={time.team.crest}
                          alt={time.team.shortName}
                          className="h-8 w-8 object-contain"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-900 sm:text-[15px] dark:text-zinc-50">
                            {time.team.shortName}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {time.team.tla}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center">
                      <span className="inline-flex min-w-[38px] items-center justify-center rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
                        {time.points}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      {time.playedGames}
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-semibold text-emerald-600">
                      {time.won}
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-semibold text-amber-500">
                      {time.draw}
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-semibold text-red-500">
                      {time.lost}
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {time.goalDifference > 0
                        ? `+${time.goalDifference}`
                        : time.goalDifference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
