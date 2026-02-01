// src/pages/PagoMulta.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";

const FINES_BUCKET = import.meta.env.VITE_FINES_BUCKET || "MultasEntrenamiento";
const FINE_AMOUNT = 100;

function Card({ className, children }) {
  return (
    <div className={cn("rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]", className)}>
      {children}
    </div>
  );
}
function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white font-semibold placeholder:text-white/55 outline-none",
        className
      )}
      {...props}
    />
  );
}
function Label({ children }) {
  return <span className="mb-1 block text-sm font-semibold text-white/85">{children}</span>;
}

export default function PagoMulta() {
  const [file, setFile] = useState(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [banco, setBanco] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const reset = () => {
    setFile(null);
    setNumeroOperacion("");
    setBanco("");
    setFecha("");
    setHora("");
  };

  const subir = async () => {
    setMsg("");

    if (!file) return setMsg("Selecciona un archivo primero.");
    if (!numeroOperacion.trim()) return setMsg("Falta Número de Operación.");
    if (!banco.trim()) return setMsg("Falta Banco o Entidad Financiera.");
    if (!fecha) return setMsg("Falta Fecha de operación.");
    if (!hora) return setMsg("Falta Hora exacta de operación.");

    const opNum = Number(String(numeroOperacion).trim());
    if (Number.isNaN(opNum) || opNum <= 0) return setMsg("Número de operación inválido.");

    setLoading(true);
    let receipt_path = null;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, dni")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!profile?.full_name) return setMsg("Tu perfil no tiene nombre.");
      if (!profile?.dni) return setMsg("Tu perfil no tiene DNI.");

      const safeName = String(file.name || "archivo")
        .replace(/\r?\n/g, "")
        .replace(/[^\w.\-() ]+/g, "_")
        .trim();

      receipt_path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage.from(FINES_BUCKET).upload(receipt_path, file, { upsert: false });
      if (upErr) throw upErr;

      const operation_datetime = `${fecha}T${hora}:00`;

      const payload = {
        user_id: user.id,
        socio_name: profile.full_name,
        socio_email: user.email || "",
        socio_dni: profile.dni,
        amount: FINE_AMOUNT,

        operation_number: opNum,
        bank: banco.trim(),
        operation_datetime,
        operation_date: fecha,
        operation_time: hora,

        receipt_path,

        admin_verification: "Pendiente",
        admin_observaciones: null,
      };

      const { error: insErr } = await supabase.from("training_fines").insert(payload);
      if (insErr) throw insErr;

      setMsg("✅ Multa registrada. Queda pendiente de validación.");
      reset();
    } catch (e) {
      if (receipt_path) {
        await supabase.storage.from(FINES_BUCKET).remove([receipt_path]);
      }
      setMsg("Error: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-white">
      <Card className="p-5">
        <h1 className="text-xl font-extrabold">Pago de multa por falta de entrenamiento</h1>
        <p className="mt-1 text-sm text-white/75">
          Monto fijo: <b>S/ {FINE_AMOUNT}</b>. Plazo: <b>viernes 12:00:00 (mediodía)</b>.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <Label>Número de Operación</Label>
            <Input value={numeroOperacion} onChange={(e) => setNumeroOperacion(e.target.value)} placeholder="Ej: 123456" inputMode="numeric" />
          </label>

          <label className="block">
            <Label>Banco o Entidad Financiera</Label>
            <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="BCP / Interbank / Yape / Plin" />
          </label>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <label className="block">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>

            <label className="block">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </label>
          </div>

          <div className="md:col-span-2">
            <Label>Adjunta tu voucher (foto o PDF)</Label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white/85 file:mr-3 file:rounded-xl file:border-0 file:bg-white/15 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-white/20"
            />
            {file ? <div className="mt-2 text-xs text-white/70">Archivo: {file.name}</div> : null}
          </div>

          <div className="md:col-span-2">
            <button
              onClick={subir}
              disabled={loading}
              className={cn(
                "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold",
                "hover:bg-white/15 active:scale-[0.99] transition",
                "disabled:opacity-60 disabled:pointer-events-none"
              )}
            >
              {loading ? "Subiendo..." : "Registrar multa (S/100)"}
            </button>

            {msg && (
              <div
                className={cn(
                  "mt-3 rounded-xl border px-3 py-2 text-sm",
                  msg.startsWith("✅")
                    ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-50"
                    : "border-amber-300/30 bg-amber-500/15 text-amber-50"
                )}
              >
                {msg}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
