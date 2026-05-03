import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const IconeSenha = mostrarSenha ? EyeOff : Eye;

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
        const nomeParticipante = nome.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: siteUrl,
            data: {
              name: nomeParticipante,
            },
          },
        });

        if (error) throw error;

        toast.success(
          data.session
            ? "Conta criada com sucesso. Agora e so palpitar."
            : "Conta criada. Enviamos um email para confirmar seu cadastro."
        );
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
    <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
          Bolao Premier League
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {modoRecuperacao
            ? "Recuperar senha"
            : modoCadastro
            ? "Criar conta"
            : "Entrar"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
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
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Karen"
              required
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="karen@email.com"
            required
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Senha
          </label>
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="********"
              required={!modoRecuperacao}
              disabled={modoRecuperacao}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
              disabled={modoRecuperacao}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <IconeSenha className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
        <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => {
              setModoRecuperacao(true);
              setSenha("");
            }}
            className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Esqueceu a senha?
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {/* {modoRecuperacao
          ? "Lembrou a senha?"
          : modoCadastro
          ? "Ja tem conta?"
          : "Ainda nao tem conta?"}{" "} */}
        <button
          type="button"
          onClick={alternarModoPrincipal}
          className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
        >
          {/* {modoRecuperacao
            ? "Voltar para entrar"
            : modoCadastro
            ? "Entrar"
            : "Criar conta"} */}
        </button>
      </div>
    </div>
  );
}
