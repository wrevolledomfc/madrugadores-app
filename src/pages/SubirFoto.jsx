// src/pages/SubirFoto.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";



const BUCKET = "avatars";
const MAX_BYTES = 1 * 1024 * 1024; // 1MB

function isAllowedType(file) {
  const t = (file?.type || "").toLowerCase();
  return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(t);
}

function extFromType(file) {
  const t = (file?.type || "").toLowerCase();
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}

export default function SubirFoto() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState(null);
  const [nombre, setNombre] = useState("Usuario");

  const [msg, setMsg] = useState("");
  const [file, setFile] = useState(null);

  // avatar actual desde profiles.avatar_url (path en storage)
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarPublicUrl, setAvatarPublicUrl] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadProfile = async () => {
    setMsg("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr) {
      setMsg("No pude cargar tu perfil: " + pErr.message);
    }

    setNombre(profile?.full_name?.trim() || user.email || "Usuario");

    const path = profile?.avatar_url || "";
    setAvatarPath(path);

    if (path) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setAvatarPublicUrl(data?.publicUrl || "");
    } else {
      setAvatarPublicUrl("");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickFile = (e) => {
  setMsg("");
  const f = e.target.files?.[0] || null;

  if (!f) {
    setFile(null);
    return;
  }

  if (!isAllowedType(f)) {
    setFile(null);
    setMsg("Formato no permitido. Usa JPG/PNG/WEBP.");
    return;
  }

  if (f.size > MAX_BYTES) {
    setFile(null);
    setMsg("Tu archivo excede 1MB. Reduce el tamaño e intenta de nuevo.");
    return;
  }

  // ✅ tal cual, sin transformar
  setFile(f);
};





  const subirFoto = async () => {
    try {
      setMsg("");
      if (!userId) throw new Error("No hay sesión activa.");
      if (!file) {
        setMsg("Selecciona una imagen primero.");
        return;
      }

      setSaving(true);

      // guardaremos SIEMPRE con el mismo path por usuario -> permite reemplazar
      const ext = extFromType(file);

// nombre único cada vez → nunca cachea
const objectPath = `${userId}/avatar-${Date.now()}.${ext}`;

      // Subir a storage (upsert reemplaza si existe)
      if (avatarPath) {
  await supabase.storage.from(BUCKET).remove([avatarPath]);
}
const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (upErr) {
        // si policies bloquean tamaño o permisos
        throw new Error("No se pudo subir: " + upErr.message);
      }

      // Guardar path en profiles.avatar_url
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: objectPath })
        .eq("id", userId);

      if (dbErr) {
        throw new Error("Subió a Storage, pero no pude guardar en profiles: " + dbErr.message);
      }

      // refrescar URL
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      setAvatarPath(objectPath);
      const url = data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : "";
setAvatarPublicUrl(url);


      setFile(null);
      setMsg("✅ Foto subida correctamente.");
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const eliminarFoto = async () => {
    try {
      setMsg("");
      if (!userId) throw new Error("No hay sesión activa.");

      setSaving(true);

      // 1) borrar del bucket si hay path
      if (avatarPath) {
        const { error: delErr } = await supabase.storage.from(BUCKET).remove([avatarPath]);
        if (delErr) {
          // si el bucket es public pero no tienes policy delete, fallará
          throw new Error("No se pudo eliminar del Storage: " + delErr.message);
        }
      }

      // 2) limpiar en profiles
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (dbErr) throw new Error("No pude limpiar avatar_url en profiles: " + dbErr.message);

      setAvatarPath("");
      setAvatarPublicUrl("");
      setFile(null);
      setMsg("🗑️ Foto eliminada.");
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando…</div>;
  }

  const showImg = previewUrl || avatarPublicUrl;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm border">
        <h1 className="text-xl font-bold">Mi foto</h1>
        <p className="mt-1 text-sm text-slate-600">
          {nombre} — sube tu foto (máximo 1MB). Se mostrará en tu Dashboard y encima del QR.
        </p>

        {msg && <p className={`mt-2 text-sm ${msg.startsWith("✅") ? "text-emerald-700" : "text-red-600"}`}>{msg}</p>}

        <div className="mt-4 flex items-center justify-center">
          {showImg ? (
            <img src={showImg} alt="preview" className="h-40 w-40 rounded-full object-cover border" />
          ) : (
            <div className="h-40 w-40 rounded-full bg-slate-200 border grid place-items-center text-2xl">
              🙂
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">Seleccionar archivo</label>
          <input
  type="file"
  accept="image/png,image/jpeg,image/jpg,image/webp"
  onChange={onPickFile}
  className="mt-2 block w-full text-sm"
  disabled={saving}
/>

          <div className="mt-2 text-xs text-slate-500">
            Formatos: JPG/PNG/WEBP. Máximo: 1MB (Supabase lo bloquea si excede).
          </div>
        </div>

        <button
          onClick={subirFoto}
          disabled={saving}
          className="mt-4 w-full rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {saving ? "Subiendo..." : "Subir foto"}
        </button>

        <button
          onClick={eliminarFoto}
          disabled={saving}
          className="mt-3 w-full rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          Eliminar foto
        </button>

        <button
          onClick={() => window.history.back()}
          disabled={saving}
          className="mt-3 w-full rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
