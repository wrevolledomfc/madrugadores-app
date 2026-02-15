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

const CLUB_URL = import.meta.env.VITE_CLUB_URL || "https://sites.google.com/view/mfc2026";

// Sheets/Admin
const SHEETS_WEBAPP_URL = import.meta.env.VITE_PAGOS_WEBAPP_URL; // /exec pagos
const SHEET_URL = import.meta.env.VITE_PAGOS_SHEET_URL;
const ASISTENCIAS_SHEET_URL = "https://docs.google.com/spreadsheets/d/1XxDB__Fh6MWHtT-VJG6KLoBBta948lAwz778mEmqR8M/edit?gid=812783321#gid=8127833210";

// Multas (admin)
const MULTAS_WEBAPP_URL = import.meta.env.VITE_MULTAS_WEBAPP_URL; // /exec multas
const MULTAS_SHEET_URL = import.meta.env.VITE_MULTAS_SHEET_URL;

// ===== Helpers =====
function formatPE(d) {
  try {
    return d.toLocaleDateString("es-PE");
  } catch {
    return String(d);
  }
}
function timeHHMM(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
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
function toNumberSafe(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  if (s === "pendiente") return "Pendiente";
  return "Pendiente";
}
function parseBestDate(row) {
  const iso = row?.operation_datetime || row?.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
function peNow() {
  return new Date();
}

function getWeekRange(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 dom .. 6 sab
  const diffToMonday = (dow === 0 ? -6 : 1) - dow;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

// ✅ ISO en -05:00 SIN UTC
function isoPEStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00-05:00`;
}
function isoPEEndOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T23:59:59-05:00`;
}

function isFridayNoonPassed(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 dom .. 5 vie
  if (day < 5) return false;
  if (day > 5) return true;
  const noon = new Date(d);
  noon.setHours(12, 0, 0, 0);
  return d.getTime() > noon.getTime();
}

function endOfWeekSunday(d = new Date()) {
  const { sunday } = getWeekRange(d);
  return sunday;
}

function remainingOpportunitiesThisWeek(weekTrainings, now = new Date()) {
  const end = endOfWeekSunday(now);
  if (now > end) return 0;
  return (weekTrainings || []).filter((t) => {
    if (!t?.open_at) return false;
    const dt = new Date(t.open_at);
    if (Number.isNaN(dt.getTime())) return false;
    return dt >= now;
  }).length;
}

// ===== UI =====
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

function BigAction({ to, href, external, title, subtitle, right }) {
  const inner = (
    <Card className="p-5 hover:bg-white/15 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-white">{title}</div>
          <div className="mt-1 text-sm text-white/75">{subtitle}</div>
        </div>
        {right ? <div className="text-right text-xs text-white/80">{right}</div> : null}
      </div>
    </Card>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="block"
      >
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState(""); // SOCIO | ADMIN
  const [msg, setMsg] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Pagos (mensualidad)
  const [payYear, setPayYear] = useState(2026);
  const [sumRegistered, setSumRegistered] = useState(0);
  const [sumValidated, setSumValidated] = useState(0);
  const [sumObserved, setSumObserved] = useState(0);
  const [lastValidatedPay, setLastValidatedPay] = useState(null);
  const [rowsYearValidated, setRowsYearValidated] = useState([]);

  // Asistencia semana
  const [weekText, setWeekText] = useState("");
  const [weekTrainings, setWeekTrainings] = useState([]); // [{id,label,training_date,start_time,open_at}]
  const [attendanceMap, setAttendanceMap] = useState(new Set());
  const [attendedThisWeek, setAttendedThisWeek] = useState(null);

  // Multas
  const [fineValidatedThisWeek, setFineValidatedThisWeek] = useState(false);
  const [finePendingThisWeek, setFinePendingThisWeek] = useState(false);

  // Admin sync
  const [syncingPayments, setSyncingPayments] = useState(false);
  const [webappOk, setWebappOk] = useState(null);

  const [syncingFines, setSyncingFines] = useState(false);
  const [webappFinesOk, setWebappFinesOk] = useState(null);

  // ✅ Regla: habilitado por entrenamiento con al menos 1 asistencia semanal
  const EXPECTED_WEEKLY = 1;

  const attendedCount = useMemo(() => attendanceMap.size, [attendanceMap]);
  const totalThisWeek = useMemo(
    () => (weekTrainings.length > 0 ? weekTrainings.length : EXPECTED_WEEKLY),
    [weekTrainings.length]
  );

  const userIdRef = useRef(null);

  const salir = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // ===== LOADERS =====
  const loadSocioSums = async (userId) => {
    const year = 2026;
    setPayYear(year);

    const { data: pays, error: pErr } = await supabase
      .from("payments")
      .select("id, amount, admin_verification, admin_observaciones, receipt_path, operation_datetime, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (pErr) {
      setMsg((m) => (m ? m + " | " : "") + "No pude cargar tus pagos: " + pErr.message);
      return;
    }

    const rowsAll = pays || [];
    const rowsYear = rowsAll.filter((r) => {
      const iso = r.operation_datetime || r.created_at;
      if (!iso) return false;
      return String(iso).slice(0, 4) === String(year);
    });

    let reg = 0,
      val = 0,
      obs = 0;

    rowsYear.forEach((row) => {
      const amt = toNumberSafe(row.amount);
      reg += amt;

      const adminSt = normalizeAdminVerification(row.admin_verification);
      if (adminSt === "Validado") val += amt;
      else if (adminSt === "Observado") obs += amt;
    });

    setSumRegistered(reg);
    setSumValidated(val);
    setSumObserved(obs);

    const validatedRowsYear = rowsYear.filter((x) => normalizeAdminVerification(x.admin_verification) === "Validado");
    setRowsYearValidated(validatedRowsYear);

    const validatedSorted = validatedRowsYear
      .slice()
      .sort((a, b) => (parseBestDate(b)?.getTime() || 0) - (parseBestDate(a)?.getTime() || 0));

    setLastValidatedPay(validatedSorted[0] || null);
  };

  const loadSocioWeek = async (userId) => {
    const { monday, sunday } = getWeekRange(new Date());
    setWeekText(`Semana del ${formatPE(monday)} al ${formatPE(sunday)}`);

    const startIso = isoPEStartOfDay(monday);
    const endIso = isoPEEndOfDay(sunday);

    // TRAININGS (semana)
    const { data: trainings, error: tErr } = await supabase
      .from("trainings")
      .select("id, label, checkin_open_at")
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
          open_at: t.checkin_open_at || null,
          training_date: String(t.checkin_open_at).slice(0, 10),
          start_time: String(t.checkin_open_at).slice(11, 16),
          label: t.label || "Entrenamiento",
        }))
      );
    }

    // ATTENDANCE (semana)
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

  const loadSocioFinesThisWeek = async (userId) => {
    const { monday, sunday } = getWeekRange(new Date());
    const startIso = isoPEStartOfDay(monday);
    const endIso = isoPEEndOfDay(sunday);

    const { data, error } = await supabase
      .from("training_fines")
      .select("id, admin_verification, created_at, operation_datetime")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false });

    if (error) {
      setMsg((m) => (m ? m + " | " : "") + "No pude cargar tus multas: " + error.message);
      setFineValidatedThisWeek(false);
      setFinePendingThisWeek(false);
      return;
    }

    const rows = data || [];
    const hasValidated = rows.some((r) => normalizeAdminVerification(r.admin_verification) === "Validado");
    const hasPending = rows.some((r) => normalizeAdminVerification(r.admin_verification) === "Pendiente");

    setFineValidatedThisWeek(hasValidated);
    setFinePendingThisWeek(hasPending);
  };

  // ===== ADMIN SYNC (PAGOS) =====
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

        const admin_verification = String(item.admin_verification || "Pendiente").trim();
        const admin_observaciones = item.admin_observaciones == null ? null : String(item.admin_observaciones);

        const payload = { admin_verification, admin_observaciones };
        const { error } = await supabase.from("payments").update(payload).eq("id", paymentId);
        if (error) failCount++;
        else okCount++;
      }

      setMsg(`✅ Sync pagos listo. Actualizados: ${okCount}. No existían: ${missingCount}. Fallaron: ${failCount}.`);
      if (userIdRef.current) await loadSocioSums(userIdRef.current);
    } catch (e) {
      setWebappOk(false);
      setMsg(`Error en Sync Pagos: ${e?.message || String(e)}`);
    } finally {
      setSyncingPayments(false);
    }
  };

  // ===== ADMIN SYNC (MULTAS) =====
  const syncValidatedFinesToSupabase = async () => {
    try {
      setMsg("");
      setSyncingFines(true);
      setWebappFinesOk(null);

      if (!MULTAS_WEBAPP_URL) throw new Error("Falta VITE_MULTAS_WEBAPP_URL en tu .env");

      const list = await jsonp(MULTAS_WEBAPP_URL + "?action=validated&callback=cb");
      setWebappFinesOk(true);

      if (!Array.isArray(list)) throw new Error("Respuesta inválida del WebApp (no es array).");
      if (list.length === 0) {
        setMsg("No hay multas por sincronizar.");
        return;
      }

      let okCount = 0,
        failCount = 0,
        missingCount = 0;

      for (const item of list) {
        const fineId = String(item.fine_id || "").trim();
        if (!fineId) continue;

        const { data: exists, error: exErr } = await supabase.from("training_fines").select("id").eq("id", fineId).maybeSingle();
        if (exErr) {
          failCount++;
          continue;
        }
        if (!exists) {
          missingCount++;
          continue;
        }

        const admin_verification = String(item.admin_verification || "Pendiente").trim();
        const admin_observaciones = item.admin_observaciones == null ? null : String(item.admin_observaciones);

        const payload = { admin_verification, admin_observaciones };
        const { error } = await supabase.from("training_fines").update(payload).eq("id", fineId);
        if (error) failCount++;
        else okCount++;
      }

      setMsg(`✅ Sync multas listo. Actualizados: ${okCount}. No existían: ${missingCount}. Fallaron: ${failCount}.`);
      if (userIdRef.current) await loadSocioFinesThisWeek(userIdRef.current);
    } catch (e) {
      setWebappFinesOk(false);
      setMsg(`Error en Sync Multas: ${e?.message || String(e)}`);
    } finally {
      setSyncingFines(false);
    }
  };

  // ===== INIT =====
  useEffect(() => {
    let channelPays = null;
    let channelFines = null;

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
      const roleText = String(profile?.role || "").trim().toLowerCase();
      const rolFinal = roleText === "admin" ? "ADMIN" : "SOCIO";
      setRol(rolFinal);

      if (profile?.avatar_url) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
        setAvatarUrl(data?.publicUrl || "");
      }

      if (rolFinal === "SOCIO") {
        await loadSocioSums(user.id);
        await loadSocioWeek(user.id);
        await loadSocioFinesThisWeek(user.id);

        channelPays = supabase
          .channel(`payments_socio_${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${user.id}` }, async () => {
            await loadSocioSums(user.id);
          })
          .subscribe();

        channelFines = supabase
          .channel(`fines_socio_${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "training_fines", filter: `user_id=eq.${user.id}` }, async () => {
            await loadSocioFinesThisWeek(user.id);
          })
          .subscribe();
      }

      setLoading(false);
    };

    cargar();
    return () => {
      if (channelPays) supabase.removeChannel(channelPays);
      if (channelFines) supabase.removeChannel(channelFines);
    };
  }, []);

  // ===== REGLAS (PAGOS) =====
  const now = peNow();
  const xMonth = now.getMonth() + 1;

  const c5 = useMemo(() => new Date(payYear, xMonth - 1, 5, 23, 59, 59, 999), [payYear, xMonth]);
  const c10 = useMemo(() => new Date(payYear, xMonth - 1, 10, 23, 59, 59, 999), [payYear, xMonth]);
  const cEOM = useMemo(() => new Date(payYear, xMonth, 0, 23, 59, 59, 999), [payYear, xMonth]);

  const w6to10Start = useMemo(() => new Date(payYear, xMonth - 1, 6, 0, 0, 0, 0), [payYear, xMonth]);
  const w6to10End = useMemo(() => new Date(payYear, xMonth - 1, 10, 23, 59, 59, 999), [payYear, xMonth]);
  const w11toEomStart = useMemo(() => new Date(payYear, xMonth - 1, 11, 0, 0, 0, 0), [payYear, xMonth]);

  const requiredDue = useMemo(() => {
    const base = now.getTime() <= c5.getTime() ? xMonth - 1 : xMonth;
    return Math.max(0, base) * 100;
  }, [now, c5, xMonth]);

  const isAlDia = useMemo(() => {
    return rol === "SOCIO" ? sumValidated >= requiredDue : null;
  }, [rol, sumValidated, requiredDue]);

  const monthWindows = useMemo(() => {
    if (rol !== "SOCIO") {
      return { paidOnOrBefore5: 0, paid6to10: 0, paid11toEom: 0, lastValidatedDate: null };
    }

    const vrows = rowsYearValidated || [];
    let paidOnOrBefore5 = 0;
    let paid6to10 = 0;
    let paid11toEom = 0;
    let last = null;

    for (const r of vrows) {
      const amt = toNumberSafe(r.amount);

      const dReg = r?.created_at ? new Date(r.created_at) : null;
      if (dReg && !Number.isNaN(dReg.getTime())) {
        const regMonth = dReg.getMonth() + 1;
        const regYear = dReg.getFullYear();

        if (regYear === payYear && regMonth === xMonth) {
          if (dReg.getTime() <= c5.getTime()) paidOnOrBefore5 += amt;
          else if (dReg.getTime() >= w6to10Start.getTime() && dReg.getTime() <= w6to10End.getTime()) paid6to10 += amt;
          else if (dReg.getTime() >= w11toEomStart.getTime() && dReg.getTime() <= cEOM.getTime()) paid11toEom += amt;
        }
      }

      const best = parseBestDate(r);
      if (best && (!last || best.getTime() > last.getTime())) last = best;
    }

    return { paidOnOrBefore5, paid6to10, paid11toEom, lastValidatedDate: last };
  }, [rol, rowsYearValidated, payYear, xMonth, c5, w6to10Start, w6to10End, w11toEomStart, cEOM]);

  const lastValidatedDate = monthWindows.lastValidatedDate;

  const paymentDecision = useMemo(() => {
    if (rol !== "SOCIO") return { ok: true, title: "", text: "" };

    if (!isAlDia) {
      return {
        ok: false,
        title: "⛔ No habilitado por pago",
        text: "No estás al día en tus cuotas mensuales (o todavía no han sido verificados todos tus pagos por el administrador).",
      };
    }

    if (now.getTime() <= c5.getTime()) {
      return {
        ok: true,
        title: "✅ Habilitado por pago",
        text: `Estás al día bajo la regla previa al 05. Recuerda: el ${formatPE(c5)} vence el pago del mes.`,
      };
    }

    if (monthWindows.paidOnOrBefore5 >= 100) {
      return { ok: true, title: "✅ Habilitado por pago", text: "Al día y con registro dentro del plazo (hasta el 05). Puedes jugar." };
    }

    if (monthWindows.paid6to10 >= 100) {
      return {
        ok: false,
        title: "⚠️ Al día, pero con restricción",
        text: `Estás al día, pero no puedes jugar la fecha siguiente al 05/${String(xMonth).padStart(2, "0")}/${payYear}, por haber registrado tu pago después del 05.`,
      };
    }

    if (monthWindows.paid11toEom >= 100) {
      return {
        ok: false,
        title: "⛔ Al día, pero sin jugar este mes",
        text: `Estás al día, pero no puedes jugar durante todo el mes ${String(xMonth).padStart(2, "0")}/${payYear}, por haber pagado luego del 10.`,
      };
    }

    return {
      ok: false,
      title: "⛔ No habilitado por pago",
      text: "No estás al día en tus cuotas mensuales (o todavía no han sido verificados todos tus pagos por el administrador).",
    };
  }, [rol, isAlDia, now, c5, monthWindows, xMonth, payYear]);

  const isHabilitadoPago = useMemo(() => (rol !== "SOCIO" ? true : paymentDecision.ok), [rol, paymentDecision.ok]);

  const paymentRuleText = useMemo(() => {
    if (rol !== "SOCIO") return "";
    return `${paymentDecision.title}\n${paymentDecision.text}`;
  }, [rol, paymentDecision]);

  // ===== ASISTENCIA SEMANAL =====
  const attendedWeekText = useMemo(() => {
    if (rol !== "SOCIO") return "";
    if (attendedCount <= 0) return "Aún no has asistido a entrenamientos esta semana.";
    if (attendedCount === 1) return "Has asistido a 1 entrenamiento esta semana.";
    return `Has asistido a ${attendedCount} entrenamientos esta semana.`;
  }, [rol, attendedCount]);

  const remainingOpp = useMemo(
    () => (rol === "SOCIO" ? remainingOpportunitiesThisWeek(weekTrainings, new Date()) : 0),
    [rol, weekTrainings]
  );

  const opportunitiesText = useMemo(() => {
    if (rol !== "SOCIO") return "";
    if (weekTrainings.length === 0) return "";
    if (remainingOpp === 0) return "Ya no quedan oportunidades para entrenar esta semana.";
    return `Te quedan ${remainingOpp} oportunidad${remainingOpp === 1 ? "" : "es"} para entrenar esta semana.`;
  }, [rol, weekTrainings.length, remainingOpp]);

  // ===== ENTRENAMIENTO / HABILITACIÓN =====
  const needsFine = useMemo(() => (rol === "SOCIO" ? attendedCount < EXPECTED_WEEKLY : false), [rol, attendedCount]);
  const fridayNoonPassed = useMemo(() => isFridayNoonPassed(now), [now]);

  const habilitadoEntreno = useMemo(() => {
    if (rol !== "SOCIO") return null;
    if (!needsFine) return true; // asistió al menos 1 vez
    if (fineValidatedThisWeek) return true; // multa validada
    return false;
  }, [rol, needsFine, fineValidatedThisWeek]);

  const entrenoRuleText = useMemo(() => {
    if (rol !== "SOCIO") return "";
    if (!needsFine) return "✅ Habilitado por entrenamiento (asististe al menos 1 vez esta semana).";
    if (fineValidatedThisWeek) return "✅ Multa validada: habilitado por entrenamiento esta semana.";
    if (!fridayNoonPassed) return "⛔ No asististe esta semana. Paga la multa (S/100) hasta el viernes 12:00:00 (mediodía).";
    return "⛔ No habilitado por entrenamiento: multa no pagada/validada dentro del plazo (viernes 12:00).";
  }, [rol, needsFine, fineValidatedThisWeek, fridayNoonPassed]);

  // ✅ CTA SOLO cuando NO entrenó (attendedCount=0)
  const showFineCTA = useMemo(() => rol === "SOCIO" && attendedCount === 0, [rol, attendedCount]);

  if (loading) return <LoadingScreen text="Cargando..." />;

  return (
    <div className="min-h-screen text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <a
                href="https://www.facebook.com/Madrugadoresfcoficial/"
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
                title="Facebook Madrugadores FC"
              >
                <img src={madrugadoresLogo} alt="Madrugadores FC" className="h-14 w-14 sm:h-20 sm:w-20 object-contain" />
              </a>

              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl font-extrabold tracking-tight leading-none">MFC Online</h1>

                <div className="mt-2 min-w-0">
                  <div className="text-white/70 text-xs sm:text-sm">Conectado como</div>
                  <div className="min-w-0">
                    <span className="block font-semibold text-white text-sm sm:text-base leading-tight truncate">{nombre}</span>
                  </div>
                </div>

                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] sm:text-sm font-bold">
                    {rol}
                  </span>
                </div>

                {msg && <p className="mt-1 text-sm text-red-200">{msg}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {avatarUrl ? (
                <div className="flex flex-col items-end gap-1">
                  <img
                    src={avatarUrl}
                    alt="Foto"
                    className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl object-cover object-center border border-white/25 shadow-lg"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/10 border border-white/15 grid place-items-center">
                  🙂
                </div>
              )}

              <SoftButton onClick={salir} className="px-4 py-2 sm:px-5 sm:py-3 text-sm sm:text-lg">
                Salir
              </SoftButton>
            </div>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
          <a href={CLUB_URL} target="_blank" rel="noreferrer" className="block" title="Ver datos del campeonato">
            <img src={superligaBanner} alt="Superliga Argentina 2026" className="w-full object-cover transition hover:scale-[1.01]" />
          </a>
        </div>
      </div>

      {/* Carrusel */}
      <div className="mx-auto max-w-5xl px-4 pt-3">
        <div className="mx-auto w-full max-w-5xl">
          <SponsorCarousel showTitle={false} slidePaddingClassName="py-2 px-4" imageClassName="max-h-20 sm:max-h-24 md:max-h-24 object-contain" />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {/* QR y FOTO */}
        <div className="grid gap-4 sm:grid-cols-2">
          <BigAction to="/mi-qr" title="Mi Carnet / QR" subtitle="Muestra tu QR al administrador o negocio." />
          <BigAction to="/mi-foto" title="Mi Foto" subtitle="Sube tu foto (máx 1MB)." />
        </div>

        {/* PAGO DEL MES */}
        {rol === "SOCIO" && (
          <div className="grid gap-4 sm:grid-cols-1">
            <BigAction
              to="/mis-pagos"
              title="Registrar tu pago del mes (Mensualidad)"
              subtitle="Sube tu voucher y revisa tu historial de pagos"
              right={
                <>
                  <div>
                    Total registrado: <b>{moneyPE(sumRegistered)}</b>
                  </div>
                  <div>
                    Total validado: <b>{moneyPE(sumValidated)}</b>
                  </div>
                  <div>
                    Total observado: <b>{moneyPE(sumObserved)}</b>
                  </div>
                </>
              }
            />
          </div>
        )}

        {/* ESTADO DE PAGOS */}
        {rol === "SOCIO" && (
          <Card className="p-5">
            <div className="text-sm font-extrabold">Estado de Pagos</div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <div className="text-sm font-extrabold">¿Estás al día en tus pagos?</div>
                <div className="mt-1 text-xs text-white/70">
                  Al {now.toISOString().slice(0, 10)} debes tener{" "}
                  <span className="font-bold text-white">{moneyPE(requiredDue)}</span> en pagos <b>validados</b>.
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    Validados: <span className="font-extrabold">{moneyPE(sumValidated)}</span>
                  </div>

                  <div
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-extrabold",
                      isAlDia ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-red-500/15 border-red-300/30 text-red-100"
                    )}
                  >
                    {isAlDia ? "✅ SÍ" : "⛔ NO"}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-extrabold">¿Habilitado por pago para jugar?</div>

                <div className="mt-2 text-xs text-white/70">
                  Regla: hasta el <b>05 (23:59:59)</b> se exige estar al día con <b>100 × (mes-1)</b>. Desde el{" "}
                  <b>06 (00:00:00)</b> se exige <b>100 × mes</b>. Si pagas después del 05: del <b>06 al 10</b> no juegas la fecha
                  siguiente; desde el <b>11</b> no juegas todo el mes.
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-xs text-white/70">
                    Corte 05: <span className="font-semibold text-white">{formatPE(c5)}</span>
                  </div>
                  <div className="text-xs text-white/70">
                    Corte 10: <span className="font-semibold text-white">{formatPE(c10)}</span>
                  </div>

                  <div className="text-xs text-white/70">
                    Último pago validado:{" "}
                    <span className="font-semibold text-white">{lastValidatedDate ? formatPE(lastValidatedDate) : "—"}</span>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold whitespace-pre-line",
                      isHabilitadoPago ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-red-500/15 border-red-300/30 text-red-100"
                    )}
                  >
                    {paymentRuleText}
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        )}

        {/* DATOS DEL TORNEO */}
        <div className="grid gap-4 sm:grid-cols-1">
          <BigAction href={CLUB_URL} external title="Datos del Torneo" subtitle="Tabla, posiciones, fixtures y estado del campeonato." />
        </div>

        {/* ASISTENCIA SEMANAL */}
        {rol === "SOCIO" && weekText && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Asistencia semanal</div>
                <div className="mt-1 text-sm text-white/75">{weekText}</div>

                <div className="mt-2 text-xs text-white/80">
                  <div>{attendedWeekText}</div>
                  {opportunitiesText ? <div>{opportunitiesText}</div> : null}
                </div>
              </div>

              <Link
                to="/asistencias"
                className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 transition text-white"
              >
                Ver entrenamientos del año
              </Link>
            </div>

            <div className="mt-3 divide-y divide-white/10">
              {weekTrainings.map((t) => {
                const ok = attendanceMap.has(t.id);
                return (
                  <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {t.label} ·{" "}
                        <span className="text-white/70">
                          {t.training_date} {timeHHMM(t.start_time)}
                        </span>
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

              {weekTrainings.length === 0 && <div className="py-3 text-sm text-white/70">Aún no hay entrenamientos cargados esta semana.</div>}
            </div>
          </Card>
        )}

        {/* ESTADOS DE CUENTA CLUB 2026 */}
        <div className="grid gap-4 sm:grid-cols-1">
          <BigAction to="/estados-cuenta" title="Estados de cuenta del Club 2026" subtitle="Revisa el estado de cuenta mensual (Sheets)." />
        </div>

        {/* HABILITADO POR ENTRENAMIENTO */}
        {rol === "SOCIO" && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-extrabold">Habilitado por entrenamiento</div>
                <div className="mt-1 text-xs text-white/70">
                  Asistencias esta semana: <b>{attendedCount}</b> / <b>{totalThisWeek}</b>.
                  {showFineCTA ? " Si no entrenas, multa S/100 hasta viernes 12:00:00." : ""}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-extrabold",
                  habilitadoEntreno ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" : "bg-red-500/15 border-red-300/30 text-red-100"
                )}
              >
                {habilitadoEntreno ? "✅ SÍ" : "⛔ NO"}
              </div>
            </div>

            <div
              className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-xs font-semibold",
                habilitadoEntreno ? "bg-emerald-500/10 border-emerald-300/20 text-emerald-50" : "bg-red-500/10 border-red-300/20 text-red-100"
              )}
            >
              {entrenoRuleText}
            </div>

            {/* ✅ LO QUE ME PEDISTE: CTA de multa SOLO si no asistió a ningún entrenamiento */}
            {showFineCTA && (
              <div className="mt-4 space-y-3">
                <Card className="p-4">
                  <div className="text-sm font-extrabold">Paga tu multa para habilitarte</div>
                  <div className="mt-1 text-xs text-white/70">
                    No registras asistencia esta semana. Para habilitarte debes pagar <b>S/100</b> (plazo: <b>viernes 12:00:00</b>).
                  </div>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  <BigAction
                    to="/multa"
                    title="Registrar pago de multa por entrenamiento"
                    subtitle="Sube tu voucher (S/100). Plazo: viernes 12:00:00."
                    right={finePendingThisWeek ? "Tienes una multa pendiente" : ""}
                  />
                  <BigAction to="/mis-multas" title="Ver mis multas" subtitle="Historial y estado (pendiente/validado/observado)." />
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ADMIN */}
        {rol === "ADMIN" && (
          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-1 mb-4">
              <BigAction
                to="/admin-scan"
                title="Escanear QR (Administrador)"
                subtitle="Registrar asistencia a entrenamientos escaneando el carnet/QR del socio."
              />
            </div>

            <div className="text-sm font-extrabold">Panel Admin</div>

            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <SoftLink href={SHEET_URL} target="_blank" rel="noreferrer">
                Abrir Validación de Pagos (Sheet)
              </SoftLink>

              <SoftLink href={ASISTENCIAS_SHEET_URL} target="_blank" rel="noreferrer">
                Abrir Asistencias (Sheet)
              </SoftLink>

              <SoftButton onClick={syncValidatedPaymentsToSupabase} disabled={syncingPayments}>
                {syncingPayments ? "Sincronizando..." : "Sync pagos validados → Supabase"}
              </SoftButton>

              <span className="text-xs text-white/70">WebApp pagos: {webappOk === null ? "—" : webappOk ? "OK" : "ERROR"}</span>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="text-sm font-extrabold">Validación de multas por entrenamiento</div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <SoftLink href={MULTAS_SHEET_URL} target="_blank" rel="noreferrer">
                  Abrir Multas (Sheet)
                </SoftLink>

                <SoftButton onClick={syncValidatedFinesToSupabase} disabled={syncingFines}>
                  {syncingFines ? "Sincronizando..." : "Sync multas validadas → Supabase"}
                </SoftButton>

                <span className="text-xs text-white/70">WebApp multas: {webappFinesOk === null ? "—" : webappFinesOk ? "OK" : "ERROR"}</span>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
