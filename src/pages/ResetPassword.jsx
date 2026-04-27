import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      toast.error("As senhas nao coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: senha });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso. Voce ja pode entrar.");
      setSenha("");
      setConfirmacao("");

      window.setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/");
      }, 1200);
    } catch (error) {
      toast.error(error.message || "Nao foi possivel redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 transition-colors dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
            Bolao Premier League
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Redefinir senha
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Escolha uma nova senha para voltar a acessar sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Nova senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="********"
              required
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="********"
              required
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
