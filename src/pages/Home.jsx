import { useEffect, useState } from "react";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import HeroBannerCanal from "../components/Header";
import LoginModal from "../components/LoginModal";
import TabelaBolao from "../components/TabelaBolao";
import TabelaJogos from "../components/TabelaDeJogos";
import { TabelaRodada } from "../components/TabelaRodada";

export default function Home({ user, modoNoturno, onLogout, onToggleTema }) {
  const navigate = useNavigate();
  const [loginAberto, setLoginAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");

  const IconeTema = modoNoturno ? Sun : Moon;

  useEffect(() => {
    async function buscarNomeUsuario() {
      if (!user?.id) {
        setNomeUsuario("");
        return;
      }

      const { data, error } = await supabase
        .from("participants")
        .select("name")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        setNomeUsuario(user.email || "Usuário");
        return;
      }

      setNomeUsuario(data?.name || user.email || "Usuário");
    }

    buscarNomeUsuario();
  }, [user]);

  const handleSair = async () => {
    setSaindo(true);

    try {
      await onLogout?.();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível sair.");
    } finally {
      setSaindo(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <HeroBannerCanal />

      <div className="border-b border-zinc-200 bg-white transition-colors dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Bem vindo(a), {nomeUsuario}
              </span>
            )}

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

            {user && (
              <button
                type="button"
                onClick={handleSair}
                disabled={saindo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <LogOut className="h-4 w-4" />
                {saindo ? "Saindo..." : "Sair"}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTema}
              aria-pressed={modoNoturno}
              aria-label={
                modoNoturno ? "Ativar modo claro" : "Ativar modo noturno"
              }
              title={modoNoturno ? "Ativar modo claro" : "Ativar modo noturno"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <IconeTema className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
       <div className="grid gap-4 md:grid-cols-10">
  <div className="col-span-6">
    <TabelaJogos />
  </div>
  <div className="col-span-4">
    <TabelaRodada />
  </div>
</div>
      </div>

      <TabelaBolao key={user?.id || "guest"} />

      {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}
    </div>
  );
}
