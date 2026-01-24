// src/pages/MiQR.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

import madrugadoresLogo from "../assets/madrugadores-logo.png";
import SponsorCarousel from "../components/SponsorCarousel";

// ✅ Fondo como AppLayout
import bg1 from "../assets/background-1.png";
import bg2 from "../assets/background-2.png";

const PAY_YEAR = 2026;
const MONTHLY_FEE = 100;

function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  if (s === "pendiente") return "Pendiente";
  return "";
}

function toNumberSafe(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Corte: día 5 23:59:59 del mes
function dueCutoffForMonth(year, monthIndex0) {
  return new Date(year, monthIndex0, 5, 23, 59, 59, 999);
}
function monthsDueCount(now, year) {
  let count = 0;
  for (let m = 0; m < 12; m++) {
    const cutoff = dueCutoffForMonth(year, m);
    if (now >= cutoff) count++;
  }
  return count;
}

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/** Fondo idéntico al AppLayout (bg1 + bg2 overlay + oscurecido) */
function AppLikeBackground() {
  return (
    <>
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

      {/* Oscurecer para legibilidad */}
      <div className="fixed inset-0 -z-10 bg-black/35" />
    </>
  );
}

/** Card tipo “tarjeta de crédito” (premium) */
function BankCard({ className, children }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/15",
        "bg-white/[0.06] backdrop-blur-xl",
        "shadow-[0_20px_55px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      {/* Brillos/bandas tipo tarjeta */}
      <div className="pointer-events-none absolute -top-32 -left-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      {/* “Borde brillante” sutil */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/10" />

      {children}
    </div>
  );
}

function SoftButton({ className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white",
        "hover:bg-white/15 active:scale-[0.99] transition",
        "disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

export default function MiQR() {
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");

  const [sumValidated, setSumValidated] = useState(0);
  const [isAlDia, setIsAlDia] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setMsg("");
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, dni, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) setMsg("No se pudo leer tu perfil.");

      setNombre(profile?.full_name?.trim() || user.email || "Usuario");
      setDni((profile?.dni || "").toString().trim());

      // avatar
      if (profile?.avatar_url) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
        setAvatarUrl(data?.publicUrl || "");
      }

      // ====== estado pagos ======
      try {
        const { data: pays, error: pErr } = await supabase
          .from("payments")
          .select("amount, admin_verification, operation_datetime, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (pErr) throw pErr;

        const rowsAll = pays || [];
        const rowsYear = rowsAll.filter((r) => {
          const iso = r.operation_datetime || r.created_at;
          return iso && String(iso).slice(0, 4) === String(PAY_YEAR);
        });

        const validatedSum = rowsYear
          .filter((r) => normalizeAdminVerification(r.admin_verification) === "Validado")
          .reduce((acc, r) => acc + toNumberSafe(r.amount), 0);

        setSumValidated(validatedSum);

        const now = new Date();
        const dueCount = monthsDueCount(now, PAY_YEAR);
        const expectedTotal = dueCount * MONTHLY_FEE;

        setIsAlDia(validatedSum >= expectedTotal);
      } catch (e) {
        setIsAlDia(null);
        setMsg((m) => (m ? m + " | " : "") + "No se pudo calcular estado de pagos.");
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const qrPayload = useMemo(() => {
    return JSON.stringify({
      v: 1,
      type: "MADRUGADORES_CHECKIN",
      user_id: userId,
      nombre,
      dni,
      email,
      ts: Date.now(),
    });
  }, [userId, nombre, dni, email]);

  const statusCard =
  isAlDia === true
    ? {
        title: "Activo",
        subtitle: "Pagos al día",
        box: "bg-white/90 border-blue-700/40",
        titleCls: "text-blue-900",       // 🔵 azul más oscuro
        subCls: "text-blue-700/80",
      }
    : isAlDia === false
    ? {
        title: "Inactivo",
        subtitle: "Pagos pendientes",
        box: "bg-white/90 border-red-700/40",
        titleCls: "text-red-800",
        subCls: "text-red-600/80",
      }
    : {
        title: "—",
        subtitle: "Estado no disponible",
        box: "bg-white/80 border-gray-400/40",
        titleCls: "text-gray-700",
        subCls: "text-gray-500",
      };



  if (loading) {
    return (
      <div className="min-h-screen text-white grid place-items-center bg-black">
        <div className="text-sm opacity-80">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative">
      {/* ✅ Fondo igual al layout */}
      <AppLikeBackground />

      {/* Header glass */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={madrugadoresLogo}
              alt="Madrugadores"
              className="h-12 w-12 rounded-2xl border border-white/15 bg-white/10 p-1.5 object-contain"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Carnet Digital · Madrugadores FC
              </h1>
              <p className="text-xs sm:text-sm text-white/75">Muestra este carnet al administrador.</p>
              {msg && <p className="mt-1 text-xs text-red-200">{msg}</p>}
            </div>
          </div>

          <SoftButton onClick={() => window.history.back()}>Volver</SoftButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <BankCard className="mx-auto max-w-md p-5">
          {/* Fondo interno del carnet usando background-2 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: `url(${bg2})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />

          <div className="relative">
            {/* Banda superior */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={madrugadoresLogo}
                  alt="Logo"
                  className="h-12 w-12 rounded-2xl border border-white/15 bg-white/10 p-1.5 object-contain"
                />
                <div>
                  <div className="text-[11px] tracking-widest text-white/70">CARNET DIGITAL</div>
                  <div className="text-base font-extrabold leading-tight">Madrugadores FC</div>
                </div>
              </div>

              {/* ✅ PILL DOBLE DE GRANDE */}
              {/* ESTADO DE SOCIO – estilo bancario */}
{/* ESTADO DE SOCIO – compacto, bancario */}
<div
  className={cn(
    "rounded-xl border shadow-sm text-center",
    "px-5 py-2",            // ⬅️ reduce altura (~60%)
    "min-w-[130px]",
    statusCard.box
  )}
>
  <div
    className={cn(
      "text-base sm:text-lg font-extrabold leading-tight",
      statusCard.titleCls
    )}
  >
    {statusCard.title}
  </div>

  <div
    className={cn(
      "text-[11px] sm:text-xs font-normal leading-tight -mt-0.5",
      statusCard.subCls
    )}
  >
    {statusCard.subtitle}
  </div>
</div>


            </div>

            {/* Cuerpo */}
            <div className="mt-5 grid grid-cols-1 gap-4">
              {/* Foto + datos */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto del socio"
                    className="h-28 w-28 rounded-[22px] object-cover border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-[22px] bg-white/10 border border-white/15 grid place-items-center text-3xl">
                    🙂
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-lg font-extrabold truncate">{nombre}</div>
                  <div className="text-sm text-white/75">
                    DNI: <span className="font-semibold text-white">{dni || "—"}</span>
                  </div>
                  <div className="text-xs text-white/60 truncate">{email}</div>

                  <div className="mt-2 text-xs text-white/70">
                    Pagos validados {PAY_YEAR}:{" "}
                    <span className="font-extrabold text-white">S/ {sumValidated.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* QR */}
              <div className="rounded-[22px] border border-white/15 bg-white/[0.08] p-4 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between">
                  {/* ✅ NUEVO TEXTO */}
                  <div className="text-sm font-extrabold">QR de Asistencia y Promociones</div>
                  <div className="text-xs text-white/60 font-mono">ID: {String(userId || "").slice(0, 8)}…</div>
                </div>

                <div className="mt-3 flex justify-center">
                  <div className="rounded-[22px] border border-white/20 bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                    <QRCodeCanvas
                      value={qrPayload}
                      size={248}
                      includeMargin
                      level="H"
                      imageSettings={{
                        src: madrugadoresLogo,
                        width: 58,
                        height: 58,
                        excavate: true,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 text-center text-xs text-white/70">
                  Muéstralo al administrador para registrar tu ingreso.
                </div>
              </div>

              {/* Footer */}
              <div className="rounded-[22px] border border-white/15 bg-black/20 p-3 text-xs text-white/70">
                <div className="flex items-center justify-between gap-3">
                  <span>Válido para entrenamientos y convenios.</span>
                  <span className="font-mono">MFC-{String(userId || "").slice(-6)}</span>
                </div>
              </div>
            </div>
          </div>
        </BankCard>

        {/* Carrusel sponsors */}
        <div className="mt-4 mx-auto w-full max-w-md">
          <SponsorCarousel
            showTitle={false}
            slidePaddingClassName="py-2 px-4"
            imageClassName="max-h-16 sm:max-h-18 md:max-h-20 object-contain"
          />
        </div>
      </main>
    </div>
  );
}
