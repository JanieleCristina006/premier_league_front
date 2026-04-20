import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

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
    setMensagem("");
    setLoading(true);

    try {
      if (modoCadastro) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
        });

        if (error) throw error;

        if (data.user) {
          await criarParticipante(data.user.id, nome);
        }

        setMensagem("Conta criada com sucesso. Agora é só entrar.");
        setModoCadastro(false);
        setNome("");
        setSenha("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) throw error;
      }
    } catch (error) {
      setMensagem(error.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Bolão Premier League
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">
            {modoCadastro ? "Criar conta" : "Entrar"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {modoCadastro
              ? "Crie sua conta para enviar seus palpites."
              : "Entre para acessar sua linha do bolão."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modoCadastro && (
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
              required
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          {mensagem && (
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Carregando..."
              : modoCadastro
              ? "Criar conta"
              : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {modoCadastro ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setModoCadastro(!modoCadastro);
              setMensagem("");
            }}
            className="font-semibold text-zinc-900 hover:underline"
          >
            {modoCadastro ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}