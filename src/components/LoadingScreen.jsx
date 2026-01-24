// src/components/LoadingScreen.jsx
import logo2026 from "../assets/madrugadores-logo2026.png";

export default function LoadingScreen({ text = "Cargando..." }) {
  return (
    <div className="min-h-screen grid place-items-center text-white">
      <div className="rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md px-6 py-6 shadow-2xl grid place-items-center">
        <img
          src={logo2026}
          alt="Madrugadores 2026"
          className="h-20 w-20 object-contain"
        />
        <div className="mt-3 text-center text-sm font-semibold text-white/80">
          {text}
        </div>
      </div>
    </div>
  );
}
