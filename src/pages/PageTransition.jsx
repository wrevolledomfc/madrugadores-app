// src/pages/PageTransition.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import bg1 from "../assets/background-1.png";
import bg2 from "../assets/background-2.png";
import logo2026 from "../assets/madrugadores-logo2026.png";

export default function PageTransition() {
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (location.pathname === "/login") return;

    setShow(true);
    const t = setTimeout(() => setShow(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!show || location.pathname === "/login") return null;

  return (
    <div className="fixed inset-0 z-9999 grid place-items-center">

      {/* fondo igual al layout */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bg1})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${bg2})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "overlay",
        }}
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* card */}
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
        <img
          src={logo2026}
          alt="Madrugadores 2026"
          className="mx-auto h-20 w-auto sm:h-24 object-contain"
        />
        <div className="mt-3 text-center text-sm font-extrabold text-white/90 tracking-wide">
          Cargando...
        </div>
      </div>
    </div>
  );
}
