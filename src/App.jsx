import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const THEME_STORAGE_KEY = "bolao-modo-noturno";

const limparTexto = (valor) => {
  const texto = typeof valor === "string" ? valor.trim() : "";

  return texto || null;
};

const obterNomeDoPerfil = (user) =>
  limparTexto(user.user_metadata?.name) ||
  limparTexto(user.user_metadata?.full_name);

const nomePareceEmail = (nome, email) => {
  const nomeNormalizado = limparTexto(nome)?.toLowerCase();
  const emailNormalizado = limparTexto(email)?.toLowerCase();
  const usuarioDoEmail = emailNormalizado?.split("@")[0];

  return (
    !!nomeNormalizado &&
    (nomeNormalizado === emailNormalizado || nomeNormalizado === usuarioDoEmail)
  );
};

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
  const nomeDoPerfil = obterNomeDoPerfil(user);

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
    const { error: erroInsert } = await supabase.from("participants").insert({
      user_id: user.id,
      name: nomeDoPerfil || "Participante",
    });

    if (erroInsert) {
      console.error("Erro ao criar participante:", erroInsert);
      return;
    }

    console.log("Participante criado com sucesso");
    return;
  }

  const deveAtualizarNome =
    nomeDoPerfil &&
    nomeDoPerfil !== existente.name &&
    (!limparTexto(existente.name) || nomePareceEmail(existente.name, user.email));

  if (deveAtualizarNome) {
    const { error: erroUpdate } = await supabase
      .from("participants")
      .update({ name: nomeDoPerfil })
      .eq("id", existente.id);

    if (erroUpdate) {
      console.error("Erro ao atualizar nome do participante:", erroUpdate);
      return;
    }

    console.log("Nome do participante atualizado com sucesso");
  }
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [modoNoturno, setModoNoturno] = useState(obterTemaInicial);
  const userId = user?.id;
  const userEmail = user?.email;
  const userMetadataName = user?.user_metadata?.name;
  const userMetadataFullName = user?.user_metadata?.full_name;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
  };

  useEffect(() => {
    let ativo = true;
    let eventosAuth = 0;

    const aplicarUsuario = (currentUser) => {
      if (ativo) {
        setUser(currentUser);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      eventosAuth += 1;
      aplicarUsuario(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (eventosAuth === 0) {
        aplicarUsuario(data.session?.user ?? null);
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    garantirParticipante({
      id: userId,
      email: userEmail,
      user_metadata: {
        full_name: userMetadataFullName,
        name: userMetadataName,
      },
    });
  }, [
    userEmail,
    userId,
    userMetadataFullName,
    userMetadataName,
  ]);

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
              onLogout={handleLogout}
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
