import { useState } from "react";
import { LogIn, Moon, Sun } from "lucide-react";
import HeroBannerCanal from "../components/Header";
import LoginModal from "../components/LoginModal";
import TabelaBolao from "../components/TabelaBolao";
import TabelaJogos from "../components/TabelaDeJogos";
import { TabelaRodada } from "../components/TabelaRodada";

export default function Home({ user, modoNoturno, onToggleTema }) {
  const [loginAberto, setLoginAberto] = useState(false);
  const IconeTema = modoNoturno ? Sun : Moon;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <HeroBannerCanal />

      <div className="border-b border-zinc-200 bg-white transition-colors dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {!user && (
              <button
                type="button"
                onClick={() => setLoginAberto(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <LogIn className="h-4 w-4" />
                Fazer login
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTema}
              aria-pressed={modoNoturno}
              aria-label={modoNoturno ? "Ativar modo claro" : "Ativar modo noturno"}
              title={modoNoturno ? "Ativar modo claro" : "Ativar modo noturno"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <IconeTema className="h-4 w-4" />
            </button>
          </div>
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
    </div>
  );
}
