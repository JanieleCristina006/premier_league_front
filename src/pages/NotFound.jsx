import { Home, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
          Erro 404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Pagina nao encontrada
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Essa rota nao existe no projeto.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            <Home className="h-4 w-4" />
            Ir para home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5"
          >
            <Undo2 className="h-4 w-4" />
            Pagina anterior
          </button>
        </div>
      </section>
    </main>
  )
}
