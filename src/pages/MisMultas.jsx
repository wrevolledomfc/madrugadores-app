// src/pages/MisMultas.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";

const FINES_BUCKET = import.meta.env.VITE_FINES_BUCKET || "MultasEntrenamiento";

function Card({ className, children }) {
  return (
    <div className={cn("rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]", className)}>
      {children}
    </div>
  );
}

function normalizeAdminVerification(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "validado") return "Validado";
  if (s === "observado") return "Observado";
  return "Pendiente";
}

function statusBadge(v) {
  const s = normalizeAdminVerification(v);
  if (s === "Validado") return { text: "Validado", cls: "bg-emerald-500/15 border-emerald-300/30 text-emerald-50" };
  if (s === "Observado") return { text: "Observado", cls: "bg-amber-500/15 border-amber-300/30 text-amber-50" };
  return { text: "Pendiente", cls: "bg-white/10 border-white/15 text-white/80" };
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function MisMultas() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);

  const load = async () => {
    setMsg("");
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("training_fines")
        .select("id, amount, operation_datetime, created_at, receipt_path, admin_verification")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data || []).map((r) => {
        let url = "";
        if (r.receipt_path) {
          const { data: pub } = supabase.storage.from(FINES_BUCKET).getPublicUrl(r.receipt_path);
          url = pub?.publicUrl || "";
        }
        return { ...r, receipt_url: url };
      });

      setRows(list);
    } catch (e) {
      setMsg("Error: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-white">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-extrabold">Mis multas por falta de entrenamiento</h1>
        <button onClick={load} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15 transition">
          Refrescar
        </button>
      </div>

      {msg ? (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-50">
          {msg}
        </div>
      ) : null}

      <Card className="mt-4 p-4 overflow-x-auto">
        <div className="text-sm font-extrabold mb-3">Historial</div>

        {loading ? (
          <div className="text-sm text-white/70">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-white/70">Aún no tienes multas registradas.</div>
        ) : (
          <table className="min-w-[880px] w-full text-sm">
            <thead className="text-white/80">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Registro</th>
                <th className="text-left py-2 pr-3">Monto</th>
                <th className="text-left py-2 pr-3">Operación</th>
                <th className="text-left py-2 pr-3">Comprobante</th>
                <th className="text-left py-2 pr-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => {
                const st = statusBadge(r.admin_verification);
                return (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">S/ {Number(r.amount || 0).toFixed(2)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(r.operation_datetime)}</td>
                    <td className="py-2 pr-3">
                      {r.receipt_url ? (
                        <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-sky-200 hover:text-sky-100 underline">
                          Ver comprobante
                        </a>
                      ) : (
                        <span className="text-white/60">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-extrabold", st.cls)}>
                        {st.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
