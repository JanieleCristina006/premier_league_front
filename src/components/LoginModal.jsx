import { useEffect } from "react";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";

export default function LoginModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflowOriginal;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Login"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-md"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar login"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <X className="h-5 w-5" />
        </button>

        <LoginForm onSuccess={onClose} />
      </div>
    </div>
  );
}
