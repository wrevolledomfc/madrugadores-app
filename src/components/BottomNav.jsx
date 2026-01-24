import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const base =
  "flex-1 text-center py-3 text-sm rounded-xl border border-white/10 bg-black/20";
const active = "bg-white/10";

export default function BottomNav() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto max-w-md px-4 py-3 flex gap-2">
        <NavLink
          to="/app"
          end
          className={({ isActive }) => `${base} ${isActive ? active : ""}`}
        >
          🏠 Inicio
        </NavLink>

        <NavLink
          to="/app/rutina"
          className={({ isActive }) => `${base} ${isActive ? active : ""}`}
        >
          💪 Rutina
        </NavLink>

        <NavLink
          to="/app/perfil"
          className={({ isActive }) => `${base} ${isActive ? active : ""}`}
        >
          👤 Perfil
        </NavLink>

        <button
          onClick={handleLogout}
          className={`${base} border-red-500/20`}
        >
          🔒 Salir
        </button>
      </div>
    </div>
  );
}
