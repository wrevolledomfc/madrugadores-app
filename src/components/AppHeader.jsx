import { supabase } from "../lib/supabase";
import madrugadoresLogo from "../assets/madrugadores-logo.png";
import { useEffect, useState } from "react";

export default function AppHeader({
  title = "Madrugadores FC",
  subtitle = "",
  showInicio = true,
  showSalir = false,
}) {
  const [nombre, setNombre] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setNombre(profile?.full_name || "");

      if (profile?.avatar_url) {
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url);

        setAvatarUrl(data?.publicUrl || "");
      }
    };

    loadUser();
  }, []);

  const irInicio = () => {
    window.location.href = "/dashboard";
  };

  const irFoto = () => {
    window.location.href = "/mi-foto";
  };

  const salir = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <img
              src={madrugadoresLogo}
              alt="Madrugadores FC"
              className="h-14 w-14 object-contain shrink-0"
            />

            <div className="min-w-0">
              <h1 className="text-lg font-extrabold truncate">{title}</h1>

              {subtitle ? (
                <div className="text-sm text-white/70 truncate">{subtitle}</div>
              ) : null}

              {nombre ? (
                <div className="text-xs text-white/60 truncate">{nombre}</div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {showInicio ? (
              <button
                type="button"
                onClick={irInicio}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition"
              >
                Inicio
              </button>
            ) : null}

            {showSalir ? (
              <button
                type="button"
                onClick={salir}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition"
              >
                Salir
              </button>
            ) : null}

            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                onClick={irFoto}
                className="h-12 w-12 rounded-xl object-cover border border-white/20 cursor-pointer hover:scale-105 transition"
              />
            ) : (
              <button
                type="button"
                onClick={irFoto}
                className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 grid place-items-center text-xs font-bold cursor-pointer hover:bg-white/20 transition"
              >
                Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}