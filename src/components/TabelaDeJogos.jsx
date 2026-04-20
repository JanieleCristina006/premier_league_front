import React, { useEffect, useState } from "react";

export default function Classificacao() {
  const [times, setTimes] = useState([]);

  useEffect(() => {
    fetch("http://futebolinglesbrasil.vps8317.panel.icontainer.cloud/api/standings?season=2025")
      .then((res) => res.json())
      .then((data) => {
        setTimes(data.standings?.[0]?.table || []);
      })
      .catch((err) => {
        console.error("Erro ao buscar classificação:", err);
      });
  }, []);

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="border-b border-zinc-200 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Premier League
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
            Classificação
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Pos
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Clube
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  PTS
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  J
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  V
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  E
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  D
                </th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
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
                    className="border-b border-zinc-100 transition hover:bg-zinc-50/80"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {isTop5 && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                        )}
                        {!isTop5 && (
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isBottom3 ? "bg-red-500" : "bg-zinc-300"
                            }`}
                          />
                        )}
                        <span className="text-sm font-bold text-zinc-800">
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
                          <span className="text-sm font-semibold text-zinc-900 sm:text-[15px]">
                            {time.team.shortName}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {time.team.tla}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center">
                      <span className="inline-flex min-w-[38px] items-center justify-center rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
                        {time.points}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-center text-sm font-medium text-zinc-600">
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

                    <td className="px-3 py-4 text-center text-sm font-bold text-zinc-800">
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