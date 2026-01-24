// src/pages/EstadoPagos.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";

const RECEIPTS_BUCKET = import.meta.env.VITE_RECEIPTS_BUCKET || "Recibos";

function qsYear(search) {
  const sp = new URLSearchParams(search || "");
  const y = Number(sp.get("year") || "");
  return Number.isFinite(y) && y > 2000 ? y : 2026;
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

function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  if (s === "pendiente") return "Pendiente";
  return "Pendiente";
}

function badgeCls(v) {
  const s = normalizeAdminVerification(v);
  if (s === "Validado") return "bg-emerald-500/15 border-emerald-300/30 text-emerald-50";
  if (s === "Observado") return "bg-amber-500/15 border-amber-300/30 text-amber-50";
  return "bg-white/10 border-white/15 text-white/80";
}

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

/**
 * ✅ Normaliza cualquier cosa que venga en receipt_path/archivo_path y devuelve SIEMPRE el PATH.
 * Soporta:
 * - "uuid/archivo.png" (ideal)
 * - "Recibos/uuid/archivo.png"
 * - URL firmada buena:  https://.../storage/v1/object/sign/Recibos/uuid/archivo.png?token=...
 * - URL firmada mala:   https://.../object/sign/Recibos/uuid/archivo.png?token=...
 * - public url:         https://.../storage/v1/object/public/Recibos/uuid/archivo.png
 */
function extractReceiptPath(raw, bucket) {
  if (!raw) return "";
  let s = String(raw).trim();

  // Si es URL, extraer la parte después de "/<bucket>/"
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const p = u.pathname || "";
      const lower = p.toLowerCase();
      const needle = `/${String(bucket).toLowerCase()}/`;
      const idx = lower.indexOf(needle);
      if (idx >= 0) {
        // "/.../<bucket>/<path>" => "<path>"
        s = p.slice(idx + needle.length);
        s = decodeURIComponent(s);
      } else {
        // fallback: algunas veces la url guarda el path en el token (no común)
        s = "";
      }
    } catch {
      // Si por alguna razón no parsea la URL, continúa abajo con el string tal cual
    }
  }

  // Si viene como "Recibos/uuid/archivo.png", quitar prefijo
  const prefix = `${bucket}/`;
  if (s.startsWith(prefix)) s = s.slice(prefix.length);

  // Quitar "/" inicial si hubiera
  s = s.replace(/^\/+/, "");

  return s;
}

export default function EstadoPagos() {
  const loc = useLocation();
  const year = qsYear(loc.search);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);

  const [opening, setOpening] = useState(null); // paymentId en apertura de comprobante

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg("");

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authErr || !user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, amount, admin_verification, admin_observaciones, admin_confirmed_at, admin_confirmed_email, receipt_path, archivo_path, operation_datetime, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg("No pude cargar tus pagos: " + error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const all = data || [];
      const filtered = all.filter((r) => {
        const iso = r.operation_datetime || r.created_at;
        return iso && String(iso).slice(0, 4) === String(year);
      });

      setRows(filtered);
      setLoading(false);
    };

    run();
  }, [year]);

  const sums = useMemo(() => {
    let val = 0,
      pen = 0,
      obs = 0;

    for (const r of rows) {
      const st = normalizeAdminVerification(r.admin_verification);
      const amt = toNumberSafe(r.amount);
      if (st === "Validado") val += amt;
      else if (st === "Observado") obs += amt;
      else pen += amt;
    }
    return { val, pen, obs };
  }, [rows]);

  const openReceipt = async (row) => {
    try {
      setMsg("");
      setOpening(row.id);

      // ✅ agarrar cualquiera (path o url guardada)
      const raw = row.archivo_path || row.receipt_path;
      const path = extractReceiptPath(raw, RECEIPTS_BUCKET);

      if (!path) {
        throw new Error(
          "Este pago no tiene comprobante válido. (receipt_path/archivo_path vacío o con URL mal guardada)."
        );
      }

      // ✅ generar SIEMPRE una signed url nueva (correcta)
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(path, 60 * 30); // 30 min

      if (error) throw error;

      const url = data?.signedUrl;
      if (!url) throw new Error("No se pudo obtener URL firmada.");

      window.open(url, "_blank", "noreferrer");
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setOpening(null);
    }
  };

  if (loading) return <LoadingScreen text="Cargando..." />;

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold">Validaciones de Pago {year}</h1>
            <p className="text-sm text-white/70">
              Aquí ves todos tus pagos (validados, pendientes y observados) del año.
            </p>
            {msg && <p className="mt-2 text-sm text-red-200">{msg}</p>}
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15 transition text-white"
          >
            ← Volver
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-white/70">Total validados</div>
            <div className="mt-1 text-lg font-extrabold">{moneyPE(sums.val)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-white/70">Total pendientes</div>
            <div className="mt-1 text-lg font-extrabold">{moneyPE(sums.pen)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-white/70">Total observados</div>
            <div className="mt-1 text-lg font-extrabold">{moneyPE(sums.obs)}</div>
          </Card>
        </div>

        <Card className="mt-4 p-4">
          <div className="text-sm font-extrabold">Pagos realizados</div>
          <div className="mt-1 text-xs text-white/70">
            Campos: Fecha/Hora operación, Monto, Estado, Validado por, Fecha de validación, Comprobante.
          </div>

          <div className="mt-4 overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="py-2 text-left">Operación</th>
                  <th className="py-2 text-left">Monto</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-left">Validado por</th>
                  <th className="py-2 text-left">Fecha validación</th>
                  <th className="py-2 text-left">Observaciones</th>
                  <th className="py-2 text-left">Comprobante</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {rows.map((r) => {
                  const dt = String(r.operation_datetime || r.created_at || "");
                  const date = dt ? dt.slice(0, 10) : "—";
                  const time = dt ? dt.slice(11, 16) : "";

                  const st = normalizeAdminVerification(r.admin_verification);
                  const validator = r.admin_confirmed_email ? String(r.admin_confirmed_email) : "Administrador";
                  const validatedAt = r.admin_confirmed_at ? String(r.admin_confirmed_at).slice(0, 10) : "—";

                  return (
                    <tr key={r.id}>
                      <td className="py-3">
                        <div className="font-semibold">
                          {date} {time}
                        </div>
                        <div className="text-xs text-white/60 font-mono">{r.id}</div>
                      </td>

                      <td className="py-3 font-extrabold">{moneyPE(toNumberSafe(r.amount))}</td>

                      <td className="py-3">
                        <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-extrabold", badgeCls(st))}>
                          {st}
                        </span>
                      </td>

                      <td className="py-3">{st === "Pendiente" ? "—" : validator}</td>
                      <td className="py-3">{st === "Pendiente" ? "—" : validatedAt}</td>

                      <td className="py-3 text-white/80">{r.admin_observaciones ? String(r.admin_observaciones) : "—"}</td>

                      <td className="py-3">
                        <SoftButton onClick={() => openReceipt(r)} disabled={opening === r.id}>
                          {opening === r.id ? "Abriendo..." : "Ver comprobante"}
                        </SoftButton>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-sm text-white/70">
                      Aún no tienes pagos en {year}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
