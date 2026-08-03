import LoadingScreen from "../components/LoadingScreen";
import BottomNav from "../components/BottomNav";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import madrugadoresLogo from "../assets/madrugadores-logo.png";
import { useNavigate } from "react-router-dom";

// ===== Helpers =====
function formatPE(d) {
  try {
    return d.toLocaleDateString("es-PE");
  } catch {
    return String(d);
  }
}

function moneyPE(n) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return `S/ ${Number(n || 0).toFixed(2)}`;
  }
}

function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  if (s === "pendiente") return "Pendiente";
  return "Pendiente";
}

function parseBestDate(row) {
  const iso = row?.last_validated_at || row?.operation_datetime || row?.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const day = d.getDay();

  if (day < 5) return false;
  if (day > 5) return true;

  const noon = new Date(d);
  noon.setHours(12, 0, 0, 0);
  return d.getTime() > noon.getTime();
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

function EstadoChip({ ok }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-extrabold whitespace-nowrap",
        ok
          ? "bg-emerald-500/15 border-emerald-300/30 text-emerald-50"
          : "bg-red-500/15 border-red-300/30 text-red-100"
      )}
    >
      {ok ? "✅ SÍ" : "⛔ NO"}
    </span>
  );
}

export default function Habilitadosporequipo() {
    const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [nombre, setNombre] = useState("");
  const [equipo, setEquipo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [rows, setRows] = useState([]);

  const EXPECTED_WEEKLY = 1;

  useEffect(() => {
    let mounted = true;
    let channelPayments = null;
    let channelAttendance = null;
    let channelFines = null;

    const cargar = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setMsg("");

        const now = new Date();

        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, role, equipo, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !profile) {
          if (!mounted) return;
          setMsg("No pude cargar tu perfil.");
          setRows([]);
          return;
        }

        if (!mounted) return;

        setNombre(profile?.full_name?.trim() || user.email || "Usuario");
        setEquipo(profile?.equipo || "");

        if (profile?.avatar_url) {
          const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
          if (mounted) setAvatarUrl(data?.publicUrl || "");
        } else {
          if (mounted) setAvatarUrl("");
        }

        if (!profile?.equipo) {
          if (!mounted) return;
          setMsg("Tu perfil no tiene equipo asignado.");
          setRows([]);
          return;
        }

        const { data: players, error: playersError } = await supabase
          .from("profiles")
          .select("id, full_name, email, dni, equipo, role")
          .eq("equipo", profile.equipo)
          .neq("role", "admin")
          .order("full_name", { ascending: true });

        if (playersError) {
          if (!mounted) return;
          setMsg("No pude cargar los jugadores del equipo: " + playersError.message);
          setRows([]);
          return;
        }

        const teamPlayers = players || [];
        const playerIds = teamPlayers.map((p) => p.id).filter(Boolean);

        if (playerIds.length === 0) {
          if (!mounted) setRows([]);
          return;
        }

        const { monday, sunday } = getWeekRange(now);
        const startIso = isoPEStartOfDay(monday);
        const endIso = isoPEEndOfDay(sunday);

        const [paymentsRes, attendanceRes, finesRes] = await Promise.all([
          supabase.rpc("get_habilitados_pago_equipo_2026"),

          supabase
            .from("attendance")
            .select("player_id, training_id, scanned_at")
            .in("player_id", playerIds)
            .gte("scanned_at", startIso)
            .lte("scanned_at", endIso),

          supabase
            .from("training_fines")
            .select("id, user_id, admin_verification, created_at, operation_datetime")
            .in("user_id", playerIds)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false }),
        ]);

        if (paymentsRes.error) {
          if (!mounted) return;
          setMsg("No pude cargar pagos: " + paymentsRes.error.message);
          setRows([]);
          return;
        }

        if (attendanceRes.error) {
          if (!mounted) return;
          setMsg("No pude cargar asistencias: " + attendanceRes.error.message);
          setRows([]);
          return;
        }

        if (finesRes.error) {
          if (!mounted) return;
          setMsg("No pude cargar multas: " + finesRes.error.message);
          setRows([]);
          return;
        }

        const paymentRows = paymentsRes.data || [];
        const attendance = attendanceRes.data || [];
        const fines = finesRes.data || [];

        // El RPC ya devuelve la lógica correcta de pagos por jugador
        const paymentMap = new Map(paymentRows.map((r) => [r.player_id, r]));

        const attendanceByUser = new Map();
        for (const a of attendance) {
          if (!attendanceByUser.has(a.player_id)) {
            attendanceByUser.set(a.player_id, new Set());
          }
          attendanceByUser.get(a.player_id).add(a.training_id);
        }

        const finesByUser = new Map();
        for (const f of fines) {
          if (!finesByUser.has(f.user_id)) finesByUser.set(f.user_id, []);
          finesByUser.get(f.user_id).push(f);
        }

        const fridayNoonPassed = isFridayNoonPassed(now);

        const processedRows = teamPlayers.map((player) => {
          const payInfo = paymentMap.get(player.id);

          const attendedCount = (attendanceByUser.get(player.id) || new Set()).size;
          const needsFine = attendedCount < EXPECTED_WEEKLY;

          const userFines = finesByUser.get(player.id) || [];
          const fineValidatedThisWeek = userFines.some(
            (r) => normalizeAdminVerification(r.admin_verification) === "Validado"
          );

          let habilitadoEntrenamiento = false;
          let detalleEntrenamiento = "";

          if (!needsFine) {
            habilitadoEntrenamiento = true;
            detalleEntrenamiento = `Asistió ${attendedCount} vez/veces esta semana.`;
          } else if (fineValidatedThisWeek) {
            habilitadoEntrenamiento = true;
            detalleEntrenamiento = "Tiene multa validada esta semana.";
          } else if (!fridayNoonPassed) {
            habilitadoEntrenamiento = false;
            detalleEntrenamiento =
              "No asistió aún; todavía puede habilitarse pagando la multa hasta el viernes a las 12:00.";
          } else {
            habilitadoEntrenamiento = false;
            detalleEntrenamiento =
              "No asistió, puede que haya pagado multa.";
          }

          return {
            id: player.id,
            full_name: player.full_name || payInfo?.full_name || "Sin nombre",
            equipo: player.equipo || payInfo?.equipo || "",
            sumValidated: Number(payInfo?.sum_validated || 0),
            requiredDue: Number(payInfo?.required_due || 0),
            lastValidatedDate: parseBestDate(payInfo),
            habilitadoPago: Boolean(payInfo?.habilitado_pago),
            detallePago: payInfo?.detalle_pago || "Sin información de pago.",
            attendedCount,
            habilitadoEntrenamiento,
            detalleEntrenamiento,
          };
        });

        processedRows.sort((a, b) => {
          const aScore =
            (a.habilitadoPago ? 1 : 0) + (a.habilitadoEntrenamiento ? 1 : 0);
          const bScore =
            (b.habilitadoPago ? 1 : 0) + (b.habilitadoEntrenamiento ? 1 : 0);

          if (bScore !== aScore) return bScore - aScore;
          return a.full_name.localeCompare(b.full_name, "es");
        });

        if (!mounted) return;
        setRows(processedRows);

        if (!channelPayments) {
          channelPayments = supabase
            .channel(`habilitados_equipo_payments_${profile.equipo}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "payments" },
              async () => {
                if (mounted) await cargar();
              }
            )
            .subscribe();
        }

        if (!channelAttendance) {
          channelAttendance = supabase
            .channel(`habilitados_equipo_attendance_${profile.equipo}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "attendance" },
              async () => {
                if (mounted) await cargar();
              }
            )
            .subscribe();
        }

        if (!channelFines) {
          channelFines = supabase
            .channel(`habilitados_equipo_fines_${profile.equipo}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "training_fines" },
              async () => {
                if (mounted) await cargar();
              }
            )
            .subscribe();
        }
      } catch (e) {
        if (!mounted) return;
        setMsg(e?.message || "Ocurrió un error al cargar la página.");
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargar();

    return () => {
      mounted = false;
      if (channelPayments) supabase.removeChannel(channelPayments);
      if (channelAttendance) supabase.removeChannel(channelAttendance);
      if (channelFines) supabase.removeChannel(channelFines);
    };
  }, []);

  if (loading) return <LoadingScreen text="Cargando habilitados por equipo..." />;

  const totalPago = rows.filter((r) => r.habilitadoPago).length;
  const totalEntreno = rows.filter((r) => r.habilitadoEntrenamiento).length;

  return (
    <div className="min-h-screen text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <img
                src={madrugadoresLogo}
                alt="Madrugadores FC"
                className="h-16 w-16 object-contain shrink-0"
              />

              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold">Habilitados por equipo</h1>
                <div className="text-sm text-white/70 truncate">
                  Equipo: {equipo || "Sin equipo"}
                </div>
                <div className="text-sm text-white/70 truncate">
                  Usuario: {nombre}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
  <button
    onClick={() => navigate("/dashboard")}
    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold text-white hover:bg-white/20 transition"
  >
    Inicio
  </button>

  {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-14 w-14 rounded-xl object-cover border border-white/20"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
                  🙂
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {msg ? (
          <Card className="p-4">
            <div className="text-sm text-red-200">{msg}</div>
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-white">
                Estado en tiempo real de tu equipo
              </div>
              <div className="mt-1 text-sm text-white/70">
                Pagos y Entrenamientos
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
                Jugadores: {rows.length}
              </div>
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-50">
                Pago OK: {totalPago}
              </div>
              <div className="rounded-xl border border-sky-300/30 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-50">
                Entreno OK: {totalEntreno}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10">
                <tr>
                  <th className="border border-white/20 px-4 py-3 text-left font-extrabold text-white">
                    Jugador
                  </th>
                  <th className="border border-white/20 px-4 py-3 text-left font-extrabold text-white">
                    Habilitado por pago
                  </th>
                  <th className="border border-white/20 px-4 py-3 text-left font-extrabold text-white">
                    Habilitado por entrenamiento
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition">
                    <td className="border border-white/20 px-4 py-4 align-top">
                      <div className="font-extrabold text-white">{row.full_name}</div>
                      <div className="text-xs text-white/70 mt-1">{row.equipo}</div>
                      <div className="text-xs text-white/60 mt-2">
                        Validado: {moneyPE(row.sumValidated)} / Exigido:{" "}
                        {moneyPE(row.requiredDue)}
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        Último pago validado:{" "}
                        {row.lastValidatedDate ? formatPE(row.lastValidatedDate) : "—"}
                      </div>
                    </td>

                    <td className="border border-white/20 px-4 py-4 align-top">
                      <div className="mb-2">
                        <EstadoChip ok={row.habilitadoPago} />
                      </div>
                      <div className="text-xs text-white/85 leading-relaxed">
                        {row.detallePago}
                      </div>
                    </td>

                    <td className="border border-white/20 px-4 py-4 align-top">
                      <div className="mb-2">
                        <EstadoChip ok={row.habilitadoEntrenamiento} />
                      </div>
                      <div className="text-xs text-white/85 leading-relaxed">
                        {row.detalleEntrenamiento}
                      </div>
                      <div className="text-xs text-white/60 mt-2">
                        Asistencias esta semana: {row.attendedCount}
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="border border-white/20 px-4 py-8 text-center text-white/70"
                    >
                      No hay jugadores para mostrar en este equipo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}