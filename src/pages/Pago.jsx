// src/pages/Pago.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";

import qrPago from "../assets/qr-de-pago.png";
import cuentas from "../assets/cuentas-mfc.png";
import AssetImage from "../components/AssetImage.jsx";

const RECEIPTS_BUCKET = import.meta.env.VITE_RECEIPTS_BUCKET || "Recibos";

function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]",
        className
      )}
    >
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

function toNumberSafe(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function nowPEParts() {
  // Para Sheets: fecha y hora de registro separadas
  // Nota: Esto usa el reloj del cliente. Si quieres 100% “servidor”, usar created_at de DB.
  const d = new Date();
  const iso = d.toISOString(); // UTC
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return { date, time };
}

export default function Pago() {
  const [file, setFile] = useState(null);

  // Datos del voucher
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [banco, setBanco] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(""); // YYYY-MM-DD
  const [hora, setHora] = useState(""); // HH:MM

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const resetForm = () => {
    setFile(null);
    setNumeroOperacion("");
    setBanco("");
    setMonto("");
    setFecha("");
    setHora("");
  };

  const subir = async () => {
    setMsg("");

    // 0) Validaciones UI
    if (!file) return setMsg("Selecciona un archivo primero.");
    if (!numeroOperacion.trim()) return setMsg("Falta Número de Operación.");
    if (!banco.trim()) return setMsg("Falta Banco o Entidad Financiera.");

    const montoNum = toNumberSafe(monto);
    if (!monto || !Number.isFinite(montoNum) || montoNum <= 0) {
      return setMsg("Falta Monto válido (mayor a 0).");
    }

    if (!fecha) return setMsg("Falta Fecha de operación.");
    if (!hora) return setMsg("Falta Hora exacta de operación.");

    const opNum = Number(String(numeroOperacion).trim());
    if (Number.isNaN(opNum) || opNum <= 0) {
      return setMsg("Número de Operación inválido (debe ser numérico).");
    }

    setLoading(true);
    let receipt_path = null;

    try {
      // 1) Usuario autenticado
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        setMsg("No hay sesión activa.");
        return;
      }

      // 2) Perfil del socio (AUTO-CREACIÓN)
      const { data: existingProfile, error: profileSelectError } = await supabase
        .from("profiles")
        .select("full_name, dni, role, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profileSelectError) {
        console.error("PROFILE SELECT ERROR:", profileSelectError);
        setMsg("No se pudo leer tu perfil (RLS o permisos).");
        return;
      }

      let profile = existingProfile;

      if (!profile) {
        const payloadProfile = {
          id: user.id,
          role: "socio",
          full_name: user.user_metadata?.full_name || null,
          dni: user.user_metadata?.dni || null,
          email: user.email || null,
        };

        const { error: profileInsertError } = await supabase.from("profiles").insert(payloadProfile);

        if (profileInsertError) {
          console.error("PROFILE INSERT ERROR:", profileInsertError);
          setMsg("No se pudo crear tu perfil (revisa RLS/policies en profiles).");
          return;
        }

        profile = payloadProfile;
      }

      if (!profile.full_name) return setMsg("Tu perfil no tiene nombre (full_name). Completa tu perfil.");
      if (!profile.dni) return setMsg("Tu perfil no tiene DNI. Completa tu perfil.");

      // 3) Subir archivo a Storage (guardamos PATH, NO URL)
      const safeName = String(file.name || "archivo")
        .replace(/\r?\n/g, "")
        .replace(/[^\w.\-() ]+/g, "_")
        .trim();

      receipt_path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(receipt_path, file, { upsert: false });

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);
        setMsg("Error al subir archivo: " + (uploadError.message || "desconocido"));
        return;
      }

      // 4) Datetime operación (voucher)
      const operation_datetime = `${fecha}T${hora}:00`;

      // 5) Registro (para Sheets): fecha/hora de registro separadas
      const { date: registered_date, time: registered_time } = nowPEParts();

      // 6) Insertar en payments
      const payload = {
        user_id: user.id,
        socio_name: profile.full_name,
        socio_email: user.email || "",
        socio_dni: profile.dni,
        socio_username: user.email?.split("@")?.[0] || "",

        operation_number: opNum,
        bank: banco.trim(),
        amount: montoNum,

        operation_datetime,
        operation_date: fecha,
        operation_time: hora,

        receipt_path,

        // ✅ nuevos campos (si no existen en tu tabla, te digo abajo cómo crearlos)
        registered_date,
        registered_time,

        bank_confirmation: "Pendiente",
        admin_verification: "Pendiente",
      };

      const { error: insertError } = await supabase.from("payments").insert(payload);

      if (insertError) {
        console.error("INSERT ERROR:", insertError);

        // cleanup del archivo subido
        if (receipt_path) {
          const { error: rmErr } = await supabase.storage.from(RECEIPTS_BUCKET).remove([receipt_path]);
          if (rmErr) console.warn("REMOVE ERROR (cleanup):", rmErr);
        }

        setMsg("Error al registrar pago: " + (insertError.message || "desconocido"));
        return;
      }

      setMsg("✅ Recibo subido y pago registrado.");
      resetForm();
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);

      if (receipt_path) {
        const { error: rmErr } = await supabase.storage.from(RECEIPTS_BUCKET).remove([receipt_path]);
        if (rmErr) console.warn("REMOVE ERROR (cleanup):", rmErr);
      }

      setMsg(err?.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* FORM */}
      <Card className="p-5">
        <h1 className="text-xl font-extrabold tracking-tight">Subir recibo</h1>
        <p className="mt-1 text-sm text-white/75">Completa los datos del voucher y adjunta el archivo.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <Label>Número de Operación</Label>
            <Input
              value={numeroOperacion}
              onChange={(e) => setNumeroOperacion(e.target.value)}
              placeholder="Ej: 123456789"
              inputMode="numeric"
            />
          </label>

          <label className="block">
            <Label>Banco o Entidad Financiera</Label>
            <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ej: BCP / Interbank / Yape / Plin" />
          </label>

          <label className="block">
            <Label>Monto (S/)</Label>
            <Input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej: 50.00" inputMode="decimal" />
          </label>

          <div className="grid grid-cols-2 gap-3">
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
              {loading ? "Subiendo..." : "Subir recibo"}
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

      {/* QR + CUENTAS */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 text-sm font-extrabold text-white">QR de Pago</div>
          <AssetImage
            src={qrPago}
            alt="QR de Pago"
            wrapClassName="p-3 bg-white/5 rounded-xl border border-white/10"
            className="h-64 w-full object-contain"
          />
          <div className="mt-2 text-xs text-white/70">Escanea y paga con tu billetera digital.</div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-extrabold text-white">Cuentas de Pago</div>
          <AssetImage
            src={cuentas}
            alt="Cuentas Madrugadores"
            wrapClassName="p-3 bg-white/5 rounded-xl border border-white/10"
            className="h-64 w-full object-contain"
          />
          <div className="mt-2 text-xs text-white/70">Transferencia bancaria (cuenta en soles).</div>
        </Card>
      </div>
    </div>
  );
}
