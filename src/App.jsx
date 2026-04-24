import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await garantirParticipante(currentUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await garantirParticipante(currentUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Home />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}
