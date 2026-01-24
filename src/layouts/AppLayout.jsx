// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import bg1 from "../assets/background-1.png";
import bg2 from "../assets/background-2.png";

export default function AppLayout() {
  return (
    <div className="min-h-screen relative">
      {/* Fondo base */}
      <div
        className="fixed inset-0 -z-20 bg-black"
        style={{
          backgroundImage: `url(${bg1})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Overlay/texture */}
      <div
        className="fixed inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `url(${bg2})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "overlay",
        }}
      />

      {/* oscurecer un poco para legibilidad */}
      <div className="fixed inset-0 -z-10 bg-black/35" />

      {/* Contenido */}
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
