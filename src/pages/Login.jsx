import LoginForm from "../components/LoginForm";

const VIDEO_LOGIN_URL =
  "https://www.youtube.com/embed/r92m0k9WW9E?autoplay=1&mute=1&controls=0&loop=1&playlist=r92m0k9WW9E&start=240&playsinline=1&modestbranding=1&rel=0";

export default function Login() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8">
      <iframe
        className="pointer-events-none absolute left-1/2 top-1/2 h-[max(56.25vw,100vh)] w-[max(100vw,177.78vh)] -translate-x-1/2 -translate-y-1/2 border-0"
        src={VIDEO_LOGIN_URL}
        title="Video de fundo do login"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        tabIndex={-1}
      />

      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
