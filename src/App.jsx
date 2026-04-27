import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const THEME_STORAGE_KEY = "bolao-modo-noturno";

const obterTemaInicial = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const temaSalvo = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (temaSalvo !== null) {
    return temaSalvo === "true";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

async function garantirParticipante(user) {
  const { data: existente, error: erroBusca } = await supabase
    .from("participants")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao buscar participante:", erroBusca);
    return;
  }

  if (!existente) {
    const nome =
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Participante";

    const { error: erroInsert } = await supabase.from("participants").insert({
      user_id: user.id,
      name: nome,
    });

    if (erroInsert) {
      console.error("Erro ao criar participante:", erroInsert);
      return;
    }

    console.log("Participante criado com sucesso");
  }
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [modoNoturno, setModoNoturno] = useState(obterTemaInicial);

  useEffect(() => {
    async function carregarUsuario() {
      const { data } = await supabase.auth.getUser();

      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await garantirParticipante(currentUser);
      }
    }

    carregarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await garantirParticipante(currentUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", modoNoturno);
    document.documentElement.style.colorScheme = modoNoturno ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, String(modoNoturno));
  }, [modoNoturno]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-700 transition-colors dark:bg-zinc-950 dark:text-zinc-200">
        Carregando...
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              user={user}
              modoNoturno={modoNoturno}
              onToggleTema={() => setModoNoturno((valorAtual) => !valorAtual)}
            />
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="*"
          element={user ? <NotFound /> : <Navigate to="/" replace />}
        />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            background: "#18181b",
            color: "#fff",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}
