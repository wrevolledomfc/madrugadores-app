// src/pages/Dashboard.jsx
import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { jsonp } from "../lib/jsonp";
import { cn } from "../lib/cn";

import madrugadoresLogo from "../assets/madrugadores-logo.png";
import superligaBanner from "../assets/superliga-banner-equipos.png";
import SponsorCarousel from "../components/SponsorCarousel";

// ✅ Link configurable (puedes cambiarlo en .env)
const CLUB_URL = import.meta.env.VITE_CLUB_URL || "https://sites.google.com/view/mfc2026";

const SHEETS_WEBAPP_URL = import.meta.env.VITE_PAGOS_WEBAPP_URL; // tu /exec
const SHEET_URL = import.meta.env.VITE_PAGOS_SHEET_URL; // tu google sheet url
const ASISTENCIAS_SHEET_URL = import.meta.env.VITE_ASISTENCIAS_SHEET_URL;

// Bucket (Storage)
const RECEIPTS_BUCKET = import.meta.env.VITE_RECEIPTS_BUCKET || "Recibos";

function formatPE(d) {
  try {
    return d.toLocaleDateString("es-PE");
  } catch {
    return String(d);
  }
}

function getWeekRange(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);

  const dow = d.getDay();
  const diffToMonday = (dow === 0 ? -6 : 1) - dow;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function timeHHMM(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function normalizeBankStatus(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "confirmado" || s === "confirmada") return "Confirmado";
  if (s === "rechazado" || s === "rechazada") return "Rechazado";
  return "Pendiente";
}

function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  if (s === "pendiente") return "Pendiente";
  return "";
}

function effectiveStatus(row) {
  // IMPORTANTE: aquí el estado final lo decide el Admin si existe admin_verification
  const adminV = normalizeAdminVerification(row?.admin_verification);
  if (adminV === "Validado") return "Confirmado";
  if (adminV === "Observado") return "Rechazado";
  return normalizeBankStatus(row?.bank_confirmation);
}

function toNumberSafe(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function moneyPE(n) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `S/ ${Number(n || 0).toFixed(2)}`;
  }
}

function badgeForAdminVerification(v) {
  const s = normalizeAdminVerification(v);
  if (s === "Validado") return { text: "Validado", cls: "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" };
  if (s === "Observado") return { text: "Observado", cls: "bg-amber-500/15 border-amber-300/30 text-amber-50" };
  return { text: "Pendiente", cls: "bg-white/10 border-white/15 text-white/80" };
}

/** UI helpers */
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

function SoftButton({ className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 active:scale-[0.99] transition",
        "disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

function SoftLink({ className, ...props }) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition",
        className
      )}
      {...props}
    />
  );
}

function Tile({ to, href, title, subtitle, tag, external = false }) {
  const inner = (
    <Card className="p-5 hover:bg-white/15 transition">
      <div className="text-xs text-white/70">{tag}</div>
      <div className="mt-1 text-lg font-extrabold text-white">{title}</div>
      <div className="mt-2 text-sm text-white/75">{subtitle}</div>
    </Card>
  );

  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className="block">
      {inner}
    </Link>
  );
}

/** === LÓGICA: AL DÍA / HABILITADO === */
function dueCutoffForMonth(year, monthIndex0) {
  // monthIndex0: 0=Ene ... 11=Dic
  // Corte local: día 5 23:59:59
  return new Date(year, monthIndex0, 5, 23, 59, 59, 999);
}

function monthsDueCount(now, year) {
  // Cuenta cuántos "cortes" ya pasaron en el año
  let count = 0;
  for (let m = 0; m < 12; m++) {
    const cutoff = dueCutoffForMonth(year, m);
    if (now >= cutoff) count++;
  }
  return count;
}

function parseBestDate(row) {
  // prioriza operation_datetime; si no, created_at
  const iso = row?.operation_datetime || row?.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState(""); // "SOCIO" | "ADMIN"
  const [msg, setMsg] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [weekText, setWeekText] = useState("");
  const [weekTrainings, setWeekTrainings] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState(new Set());
  const [attendedThisWeek, setAttendedThisWeek] = useState(null);

  const [payYear, setPayYear] = useState(2026);
  const [sumConfirmed, setSumConfirmed] = useState(0);
  const [sumPending, setSumPending] = useState(0);
  const [sumRejected, setSumRejected] = useState(0);

  // ✅ ahora guardamos el último pago VALIDADO (no cualquier último)
  const [lastValidatedPay, setLastValidatedPay] = useState(null);

  const [syncingPayments, setSyncingPayments] = useState(false);
  const [webappOk, setWebappOk] = useState(null);

  const attendedCount = useMemo(() => attendanceMap.size, [attendanceMap]);

  const EXPECTED_WEEKLY = 4;
  const totalThisWeek = useMemo(() => (weekTrainings.length > 0 ? weekTrainings.length : EXPECTED_WEEKLY), [weekTrainings]);

  const userIdRef = useRef(null);

  const salir = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const loadSocioSums = async (userId) => {
    const year = 2026;
    setPayYear(year);

    const { data: pays, error: pErr } = await supabase
      .from("payments")
      .select(
        "id, amount, bank_confirmation, admin_verification, admin_observaciones, admin_confirmed_at, admin_confirmed_email, receipt_path, archivo_path, operation_datetime, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (pErr) {
      setMsg((m) => (m ? m + " | " : "") + "No pude cargar tus pagos: " + pErr.message);
      return;
    }

    const rowsAll = pays || [];
    const rows = rowsAll.filter((r) => {
      const iso = r.operation_datetime || r.created_at;
      if (!iso) return false;
      return String(iso).slice(0, 4) === String(year);
    });

    let c = 0,
      pe = 0,
      rr = 0;

    rows.forEach((row) => {
      const status = effectiveStatus(row);
      const amt = toNumberSafe(row.amount);
      if (status === "Confirmado") c += amt;
      else if (status === "Rechazado") rr += amt;
      else pe += amt;
    });

    setSumConfirmed(c);
    setSumPending(pe);
    setSumRejected(rr);

    // ✅ último pago VALIDADO por admin
    const validated = rows
      .filter((x) => normalizeAdminVerification(x.admin_verification) === "Validado")
      .slice()
      .sort((a, b) => {
        const da = parseBestDate(a);
        const db = parseBestDate(b);
        return (db?.getTime() || 0) - (da?.getTime() || 0);
      });

    setLastValidatedPay(validated[0] || null);
  };

  const loadSocioWeek = async (userId) => {
    const { monday, sunday } = getWeekRange(new Date());
    setWeekText(`Semana del ${formatPE(monday)} al ${formatPE(sunday)}`);

    const startIso = `${monday.toISOString().slice(0, 10)}T00:00:00-05:00`;
    const endIso = `${sunday.toISOString().slice(0, 10)}T23:59:59-05:00`;

    const { data: trainings, error: tErr } = await supabase
      .from("trainings")
      .select("id, label, checkin_open_at, checkin_close_at")
      .gte("checkin_open_at", startIso)
      .lte("checkin_open_at", endIso)
      .order("checkin_open_at", { ascending: true });

    if (tErr) {
      setMsg((m) => (m ? m + " | " : "") + `No pude cargar entrenamientos: ${tErr.message}`);
      setWeekTrainings([]);
    } else {
      const list = trainings || [];
      setWeekTrainings(
        list.map((t) => ({
          id: t.id,
          training_date: String(t.checkin_open_at).slice(0, 10),
          start_time: String(t.checkin_open_at).slice(11, 16),
          label: t.label || "Entrenamiento",
        }))
      );
    }

    const { data: atts, error: aErr } = await supabase
      .from("attendance")
      .select("training_id, scanned_at")
      .eq("player_id", userId)
      .gte("scanned_at", startIso)
      .lte("scanned_at", endIso);

    if (aErr) {
      setMsg((m) => (m ? m + " | " : "") + `No pude verificar asistencia: ${aErr.message}`);
      setAttendedThisWeek(null);
      setAttendanceMap(new Set());
      return;
    }

    const attList = atts || [];
    const attendedTrainingIds = new Set(attList.map((x) => x.training_id).filter(Boolean));
    setAttendedThisWeek(attendedTrainingIds.size > 0);
    setAttendanceMap(attendedTrainingIds);
  };

  const syncValidatedPaymentsToSupabase = async () => {
    try {
      setMsg("");
      setSyncingPayments(true);
      setWebappOk(null);

      if (!SHEETS_WEBAPP_URL) throw new Error("Falta VITE_PAGOS_WEBAPP_URL en tu .env");

      const list = await jsonp(SHEETS_WEBAPP_URL + "?callback=cb");
      setWebappOk(true);

      if (!Array.isArray(list)) throw new Error("Respuesta inválida del WebApp (no es array).");
      if (list.length === 0) {
        setMsg("No hay pagos validados por sincronizar.");
        return;
      }

      let okCount = 0,
        failCount = 0,
        missingCount = 0;

      for (const item of list) {
        const paymentId = String(item.payment_id || "").trim();
        if (!paymentId) continue;

        const { data: exists, error: exErr } = await supabase.from("payments").select("id").eq("id", paymentId).maybeSingle();
        if (exErr) {
          failCount++;
          continue;
        }
        if (!exists) {
          missingCount++;
          continue;
        }

        const bank_confirmation = String(item.bank_confirmation || "").trim();
        const admin_observaciones =
          item.admin_observacion === null || item.admin_observacion === undefined ? null : String(item.admin_observacion);
        const amount = item.amount === null || item.amount === undefined ? null : Number(item.amount);

        const payload = { bank_confirmation, admin_observaciones };
        if (Number.isFinite(amount)) payload.amount = amount;

        const { error } = await supabase.from("payments").update(payload).eq("id", paymentId);
        if (error) failCount++;
        else okCount++;
      }

      setMsg(`✅ Sync listo. Actualizados: ${okCount}. No existían: ${missingCount}. Fallaron: ${failCount}.`);
    } catch (e) {
      setWebappOk(false);
      setMsg(`Error en Sync Pagos: ${e?.message || String(e)}`);
    } finally {
      setSyncingPayments(false);
    }
  };

  useEffect(() => {
    let channel = null;

    const cargar = async () => {
      setMsg("");
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      userIdRef.current = user.id;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) setMsg((m) => (m ? m + " | " : "") + "Perfil: " + profileError.message);

      setNombre(profile?.full_name?.trim() || user.email || "Usuario");

      // ✅ FIX anti-crash
      const roleValue = profile?.role;
      const roleText =
        typeof roleValue === "string"
          ? roleValue
          : roleValue == null
          ? ""
          : Array.isArray(roleValue)
          ? String(roleValue[0] ?? "")
          : String(roleValue);

      const rolFinal = roleText.trim().toLowerCase() === "admin" ? "ADMIN" : "SOCIO";
      setRol(rolFinal);

      if (profile?.avatar_url) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
        setAvatarUrl(data?.publicUrl || "");
      }

      if (rolFinal === "SOCIO") {
        await loadSocioSums(user.id);
        await loadSocioWeek(user.id);

        // ✅ realtime
        channel = supabase
          .channel(`payments_socio_${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${user.id}` }, async () => {
            await loadSocioSums(user.id);
          })
          .subscribe();
      }

      setLoading(false);
    };

    cargar();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <LoadingScreen text="Cargando..." />;

  // ====== AL DÍA / HABILITADO (solo SOCIO) ======
  const now = new Date();
  const dueCount = monthsDueCount(now, payYear);
  const expectedTotal = dueCount * 100;

  const isAlDia = rol === "SOCIO" ? sumConfirmed >= expectedTotal : null;

  // Corte del mes actual
  const currentMonthCutoff = dueCutoffForMonth(payYear, now.getMonth());
  const lastValidatedDate = parseBestDate(lastValidatedPay);

  // regla exacta: habilitado solo si AL DÍA y último pago validado fue ANTES/IGUAL al corte del mes (día 5 23:59:59)
  const isHabilitado = rol === "SOCIO" ? isAlDia && lastValidatedDate && lastValidatedDate <= currentMonthCutoff : null;

  // ====== UI ======
  const lastAdminBadge = badgeForAdminVerification(lastValidatedPay?.admin_verification);

  return (
    <div className="min-h-screen text-white">
      {/* Header (glass) */}
      {/* Header (glass) */}
<header className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
  <div className="mx-auto max-w-5xl px-4 py-4">
    <div className="relative flex items-center justify-between gap-3">

      {/* ESCUDO: izquierda absoluta (sin cuadrado) */}
      <img
        src={madrugadoresLogo}
        alt="Madrugadores FC"
        className="absolute left-0 top-1/2 -translate-y-1/2 h-14 w-14 sm:h-16 sm:w-16 object-contain"
      />

      {/* CENTRO: título + conectado como */}
      <div className="pl-16 sm:pl-20">
        {/* Título en una sola línea, diferente al resto */}
        <div className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none whitespace-nowrap">
            MFC ONline
          </h1>
        </div>

        <p className="mt-2 text-sm text-white/75">
          Conectado como <span className="font-semibold text-white">{nombre}</span> ·{" "}
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-bold">
            {rol}
          </span>
        </p>

        {msg && <p className="mt-1 text-xs text-red-200">{msg}</p>}
      </div>

      {/* DERECHA: foto (cuadrado redondeado) + salir */}
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Foto"
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-white/20"
          />
        ) : (
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/10 border border-white/15 grid place-items-center text-sm">
            🙂
          </div>
        )}

        <SoftButton onClick={salir}>Salir</SoftButton>
      </div>

    </div>
  </div>
</header>


      {/* ✅ Banner Superliga */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
          <img src={superligaBanner} alt="Superliga" className="w-full max-h-[170px] sm:max-h-[210px] md:max-h-[240px] object-cover" />
        </div>
      </div>

      {/* Carrusel patrocinadores (angosto, mitad del banner) */}
<div className="mx-auto max-w-5xl px-4 pt-3">
  <div className="mx-auto w-full max-w-5xl">
    <SponsorCarousel
      showTitle={false}
      slidePaddingClassName="py-3 px-6"
      imageClassName="max-h-20 sm:max-h-24 md:max-h-28 object-contain"
    />
  </div>
</div>


      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Tile to="/pago" tag="Pagos" title="Registrar tu pago" subtitle="Sube tu recibo y deja constancia." />
          <Tile href={CLUB_URL} external tag="Club" title="Ver Datos del Campeonato" subtitle="Mira la tabla y el estado." />
          <Tile to="/mi-qr" tag="Asistencia" title="Mi Carnet/QR" subtitle="Muestra tu Carnet/QR al administrador/Negocio con Conveio." />
          <Tile to="/mi-foto" tag="Perfil" title="Mi foto" subtitle="Sube tu foto (máx 1MB)." />
          {rol === "ADMIN" && <Tile to="/admin-scan" tag="Admin" title="Escanear QR" subtitle="Registra ingresos escaneando el QR." />}
        </div>

        {/* Main Card */}
        <Card className="mt-6 p-5">
          <div className="text-xs text-white/70">Estado de Pagos</div>
          <div className="mt-1 text-base font-semibold">
            Hola, {nombre}. Acceso de {rol === "ADMIN" ? "administrador" : "socio"}.
          </div>

          {/* ADMIN */}
          {rol === "ADMIN" && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <SoftLink href={SHEET_URL} target="_blank" rel="noreferrer">
                Abrir Validación de Pagos (Sheet)
              </SoftLink>
              <SoftLink href={ASISTENCIAS_SHEET_URL} target="_blank" rel="noreferrer">
                Abrir Asistencias (Sheet)
              </SoftLink>
              <SoftButton onClick={syncValidatedPaymentsToSupabase} disabled={syncingPayments}>
                {syncingPayments ? "Sincronizando..." : "Sync pagos validados → Supabase"}
              </SoftButton>
              <span className="text-xs text-white/70">WebApp: {webappOk === null ? "—" : webappOk ? "OK" : "ERROR"}</span>
            </div>
          )}

          {/* SOCIO */}
          {rol === "SOCIO" && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <div className="text-xs text-white/70">Pagos validados {payYear}</div>
                  <div className="mt-1 text-lg font-extrabold">{moneyPE(sumConfirmed)}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-white/70">Pagos pendientes {payYear}</div>
                  <div className="mt-1 text-lg font-extrabold">{moneyPE(sumPending)}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-white/70">Pagos observados {payYear}</div>
                  <div className="mt-1 text-lg font-extrabold">{moneyPE(sumRejected)}</div>
                </Card>
              </div>

              {/* ✅ NUEVO BLOQUE: Al día / habilitado */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <div className="text-sm font-extrabold">¿Estás al día en tus pagos?</div>
                  <div className="mt-1 text-xs text-white/70">
                    Cálculo automático: al día {now.toISOString().slice(0, 10)} → Debes tener{" "}
                    <span className="font-bold text-white">{moneyPE(expectedTotal)}</span> en pagos <b>validados</b> por el Admin.
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      Validados: <span className="font-extrabold">{moneyPE(sumConfirmed)}</span>
                    </div>

                    <div
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-extrabold",
                        isAlDia ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-red-500/15 border-red-300/30 text-red-100"
                      )}
                    >
                      {isAlDia ? "✅ SÍ, estás al día" : "⛔ NO, no estás al día"}
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm font-extrabold">¿Habilitado por Pago para jugar?</div>
                  <div className="mt-1 text-xs text-white/70">
                    Requisito: estar al día y que tu <b>último pago validado</b> sea <b>antes o igual</b> al corte del mes (día 5 - 23:59:59).
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-white/70">
                      Corte mes actual:{" "}
                      <span className="font-semibold text-white">{formatPE(currentMonthCutoff)} 23:59:59</span>
                    </div>

                    <div className="text-xs text-white/70">
                      Último pago validado:{" "}
                      <span className="font-semibold text-white">
                        {lastValidatedDate ? `${formatPE(lastValidatedDate)} ${String(lastValidatedDate).slice(16, 21)}` : "—"}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-extrabold",
                        isHabilitado ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-red-500/15 border-red-300/30 text-red-100"
                      )}
                    >
                      {isHabilitado ? "✅ SÍ (habilitado)" : "⛔ NO (no habilitado por pago)"}
                    </div>
                  </div>
                </Card>
              </div>

              {/* ✅ Estado de validación + botón a página nueva */}
              <Card className="mt-4 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-bold">Estado de validación (Admin)</div>
                    <div className="mt-1 text-xs text-white/70">Se muestran las validaciones del año {payYear} para este socio.</div>
                  </div>

                  <Link
                    to={`/estado-pagos?year=${payYear}`}
                    className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 transition text-white"
                  >
                    Ver Todas las Validaciones de Pago del año
                  </Link>
                </div>

                {lastValidatedPay ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <div className="font-semibold">
                        {moneyPE(toNumberSafe(lastValidatedPay.amount))} ·{" "}
                        <span className="text-white/70">{(lastValidatedPay.operation_datetime || lastValidatedPay.created_at || "").slice(0, 10)}</span>
                      </div>
                      {lastValidatedPay.admin_observaciones ? (
                        <div className="mt-1 text-xs text-white/70">Obs: {String(lastValidatedPay.admin_observaciones)}</div>
                      ) : null}
                    </div>

                    <div className={cn("rounded-full border px-3 py-1 text-xs font-extrabold", lastAdminBadge.cls)}>
                      {lastAdminBadge.text}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/70">Aún no tienes pagos validados este año.</div>
                )}
              </Card>
            </>
          )}

          {/* Week attendance */}
          {rol === "SOCIO" && weekText && (
            <div className="mt-5 space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">Asistencia semanal</div>
                    <div className="mt-1 text-sm text-white/75">{weekText}</div>
                  </div>

                  <Link
                    to="/asistencias"
                    className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 transition text-white"
                  >
                    Ver entrenamientos del año
                  </Link>

                  <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
                    <span className="font-extrabold">{attendedCount}</span> / <span className="font-extrabold">{totalThisWeek}</span>{" "}
                    <span className="text-white/70">asistencias</span>
                  </div>
                </div>

                {attendedThisWeek === true && <div className="mt-3 text-sm">✅ Asistió esta semana.</div>}
                {attendedThisWeek === false && <div className="mt-3 text-sm">⛔ No asistió esta semana.</div>}
                {attendedThisWeek === null && <div className="mt-3 text-sm text-white/70">(No se pudo verificar.)</div>}
              </Card>

              <Card className="p-4">
                <div className="text-sm font-extrabold">Entrenamientos de esta semana</div>
                <div className="mt-1 text-xs text-white/70">Se marca ✅ si tienes asistencia registrada.</div>

                <div className="mt-3 divide-y divide-white/10">
                  {weekTrainings.map((t) => {
                    const ok = attendanceMap.has(t.id);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {t.label || "Entrenamiento"} ·{" "}
                            <span className="text-white/70">
                              {t.training_date} {timeHHMM(t.start_time)}
                            </span>
                          </div>
                          <div className="text-xs text-white/60">
                            ID: <span className="font-mono">{t.id}</span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-extrabold",
                            ok ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-white/10 border-white/15 text-white/80"
                          )}
                        >
                          {ok ? "✅ Asistió" : "⛔ No asistió"}
                        </div>
                      </div>
                    );
                  })}

                  {weekTrainings.length === 0 && (
                    <div className="py-3 text-sm text-white/70">
                      Aún no hay entrenamientos cargados esta semana (por eso se muestra 0/{EXPECTED_WEEKLY} arriba).
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {rol === "ADMIN" && <p className="mt-3 text-sm text-white/70">Como admin, puedes abrir la Sheet y validar. Eso se refleja en Supabase.</p>}
        </Card>
      </main>
    </div>
  );
}
