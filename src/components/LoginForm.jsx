import { useState } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";

export default function LoginForm({ onSuccess }) {
  const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(
    /\/$/,
    ""
  );
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const criarParticipante = async (userId, nomeParticipante) => {
    const { error } = await supabase.from("participants").insert({
      user_id: userId,
      name: nomeParticipante,
    });

    if (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modoRecuperacao) {
        const redirectTo = `${siteUrl}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) throw error;

        toast.success(
          "Se o e-mail existir, voce recebera um link para redefinir a senha."
        );
        setModoRecuperacao(false);
      } else if (modoCadastro) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              name: nome,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await criarParticipante(data.user.id, nome);
        }

        toast.success("Conta criada com sucesso. Agora e so entrar.");
        setModoCadastro(false);
        setNome("");
        setSenha("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) throw error;

        toast.success("Login realizado com sucesso.");
        onSuccess?.();
      }
    } catch (error) {
      toast.error(error.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  const alternarModoPrincipal = () => {
    if (modoRecuperacao) {
      setModoRecuperacao(false);
    } else {
      setModoCadastro(!modoCadastro);
    }

    setSenha("");
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Bolao Premier League
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">
          {modoRecuperacao
            ? "Recuperar senha"
            : modoCadastro
            ? "Criar conta"
            : "Entrar"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {modoRecuperacao
            ? "Informe seu e-mail para receber o link de redefinicao."
            : modoCadastro
            ? "Crie sua conta para enviar seus palpites."
            : "Entre para acessar sua linha do bolao."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {modoCadastro && !modoRecuperacao && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Karen"
              required
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="karen@email.com"
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            required={!modoRecuperacao}
            disabled={modoRecuperacao}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Carregando..."
            : modoRecuperacao
            ? "Enviar link"
            : modoCadastro
            ? "Criar conta"
            : "Entrar"}
        </button>
      </form>

      {!modoCadastro && !modoRecuperacao && (
        <div className="mt-4 text-center text-sm text-zinc-500">
          <button
            type="button"
            onClick={() => {
              setModoRecuperacao(true);
              setSenha("");
            }}
            className="font-semibold text-zinc-900 hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-zinc-500">
        {modoRecuperacao
          ? "Lembrou a senha?"
          : modoCadastro
          ? "Ja tem conta?"
          : "Ainda nao tem conta?"}{" "}
        <button
          type="button"
          onClick={alternarModoPrincipal}
          className="font-semibold text-zinc-900 hover:underline"
        >
          {modoRecuperacao
            ? "Voltar para entrar"
            : modoCadastro
            ? "Entrar"
            : "Criar conta"}
        </button>
      </div>
    </div>
  );
}
