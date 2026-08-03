import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "../lib/cn";

import {
  FaMoneyBillWave,
  FaMoon,
  FaIdCard,
  FaCamera,
  FaGift,
  FaTrophy,
} from "react-icons/fa";

const CLUB_URL =
  import.meta.env.VITE_CLUB_URL || "https://mfc-estadisticas.pages.dev";

function BottomNavLink({ to, title, icon: Icon }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <a
      href={to}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition",
        active ? "text-white" : "text-white/65"
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-2xl border",
          active
            ? "border-white/30 bg-white/15"
            : "border-white/10 bg-white/5"
        )}
      >
        <Icon size={18} />
      </div>
      <span className="text-[10px] font-extrabold">{title}</span>
    </a>
  );
}

function BottomNavExternal({ href, title, icon: Icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-white/65"
    >
      <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
        <Icon size={18} />
      </div>
      <span className="text-[10px] font-extrabold">{title}</span>
    </a>
  );
}

export default function MainLayout() {
  return (
    <div className="min-h-screen text-white pb-20">
      
      {/* CONTENIDO DE LAS PÁGINAS */}
      <Outlet />

      {/* BARRA FIJA GLOBAL */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl px-2 py-1">
          <BottomNavLink to="/mis-pagos" title="Pago Mes" icon={FaMoneyBillWave} />
          <BottomNavLink to="/pago-entrenamiento-nocturno" title="P. Noche" icon={FaMoon} />
          <BottomNavLink to="/mi-qr" title="Carnet QR" icon={FaIdCard} />
          <BottomNavLink to="/Fotografias" title="Fotos" icon={FaCamera} />
          <BottomNavLink to="/catalogo" title="Catálogo" icon={FaGift} />
          <BottomNavExternal href={CLUB_URL} title="Campeonato" icon={FaTrophy} />
        </div>
      </nav>
    </div>
  );
}