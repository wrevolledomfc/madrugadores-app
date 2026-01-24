import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");

  useEffect(() => {
    const cargarPerfil = async () => {
      setMsg("");
      setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      const user = authData?.user;
      if (authError || !user) {
        setMsg("No hay sesión activa.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, dni")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        setMsg("Error al cargar el perfil.");
        setLoading(false);
        return;
      }

      if (profile) {
        setFullName(profile.full_name || "");
        setDni(profile.dni || "");
      }

      setLoading(false);
    };

    cargarPerfil();
  }, []);

  const guardarPerfil = async () => {
    setMsg("");

    if (!fullName.trim()) {
      setMsg("El nombre completo es obligatorio.");
      return;
    }

    if (!dni || !/^[0-9]{8}$/.test(dni)) {
      setMsg("El DNI debe tener exactamente 8 dígitos.");
      return;
    }

    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setMsg("No hay sesión activa.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      dni,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setMsg("✅ Perfil actualizado correctamente.");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando perfil…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm border">
        <h1 className="text-xl font-bold">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-600">
          Completa tus datos personales. El DNI es obligatorio para registrar
          pagos.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Nombre completo
            </span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Socio 1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">DNI</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={dni}
              onChange={(e) =>
                setDni(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Ej: 12345678"
              maxLength={8}
            />
          </label>

          <button
            onClick={guardarPerfil}
            disabled={saving}
            className="mt-3 w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>

          {msg && <p className="text-sm">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
