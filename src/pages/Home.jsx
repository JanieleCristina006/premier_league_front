import { useState } from "react";
import { LogIn } from "lucide-react";
import HeroBannerCanal from "../components/Header";
import LoginModal from "../components/LoginModal";
import TabelaBolao from "../components/TabelaBolao";
import TabelaJogos from "../components/TabelaDeJogos";
import { TabelaRodada } from "../components/TabelaRodada";

export default function Home({ user }) {
  const [loginAberto, setLoginAberto] = useState(false);

  return (
    <>
      <HeroBannerCanal />

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Bolao Premier League
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-600">
              Acompanhe jogos, classificacao e palpites em um so lugar.
            </p>
          </div>

          {!user && (
            <button
              type="button"
              onClick={() => setLoginAberto(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <LogIn className="h-4 w-4" />
              Fazer login
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TabelaJogos />
          <TabelaRodada />
        </div>
      </div>

      <TabelaBolao key={user?.id || "guest"} />

      {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}
    </>
  );
}
