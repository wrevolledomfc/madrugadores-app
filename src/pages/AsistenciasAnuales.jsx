// src/pages/AsistenciasAnuales.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function moneyDatePE(iso) {
  if (!iso) return "";
  try {
    // iso puede ser timestamptz; lo mostramos como YYYY-MM-DD HH:MM
    const s = String(iso);
    const d = s.slice(0, 10);
    const t = s.slice(11, 16);
    return `${d} ${t}`;
  } catch {
    return String(iso);
  }
}

export default function AsistenciasAnuales() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [year, setYear] = useState(2026);
  const [rows, setRows] = useState([]);

  const total = useMemo(() => rows.length, [rows]);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setMsg("");
      setRows([]);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      // Rango anual en UTC (suficiente y simple)
      const startIso = `${year}-01-01T00:00:00.000Z`;
      const endIso = `${year + 1}-01-01T00:00:00.000Z`;

      // 1) Traer asistencias del año
      const { data: atts, error: aErr } = await supabase
        .from("attendance")
        .select("training_id, scanned_at")
        .eq("player_id", user.id)
        .gte("scanned_at", startIso)
        .lt("scanned_at", endIso)
        .order("scanned_at", { ascending: false });

      if (aErr) {
        setMsg("No pude cargar tus asistencias: " + aErr.message);
        setLoading(false);
        return;
      }

      const attList = atts || [];
      const trainingIds = Array.from(new Set(attList.map((x) => x.training_id).filter(Boolean)));

      if (trainingIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) Traer detalle de trainings para esos IDs
      const { data: trainings, error: tErr } = await supabase
        .from("trainings")
        .select("id, label, checkin_open_at")
        .in("id", trainingIds);

      if (tErr) {
        // Si falla join, igual mostramos algo
        setRows(
          attList.map((a) => ({
            training_id: a.training_id,
            scanned_at: a.scanned_at,
            label: "Entrenamiento",
            checkin_open_at: null,
          }))
        );
        setMsg((m) => (m ? m + " | " : "") + "No pude leer detalles de trainings: " + tErr.message);
        setLoading(false);
        return;
      }

      const tMap = new Map((trainings || []).map((t) => [t.id, t]));

      // 3) Merge: asistencia + entrenamiento
      const merged = attList.map((a) => {
        const t = tMap.get(a.training_id);
        return {
          training_id: a.training_id,
          scanned_at: a.scanned_at,
          label: t?.label || "Entrenamiento",
          checkin_open_at: t?.checkin_open_at || null,
        };
      });

      setRows(merged);
      setLoading(false);
    };

    cargar();
  }, [year]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Asistencias del año</h1>
            <p className="text-sm text-slate-600">
              Aquí ves todos los entrenamientos en los que marcaste asistencia.
            </p>
          </div>

          <Link to="/dashboard" className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50">
            Volver
          </Link>
        </div>

        {msg && <div className="mt-3 text-sm text-red-600">{msg}</div>}

        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm text-slate-600">Año:</label>
          <select
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          <div className="ml-auto rounded-xl border bg-white px-3 py-2 text-sm">
            Total: <span className="font-semibold">{total}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          {rows.length === 0 ? (
            <div className="text-sm text-slate-600">Aún no tienes asistencias registradas en {year}.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r, idx) => (
                <div key={`${r.training_id}-${idx}`} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {r.label}{" "}
                      <span className="text-slate-600">
                        · {moneyDatePE(r.checkin_open_at || r.scanned_at)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Asistencia marcada: <span className="font-mono">{moneyDatePE(r.scanned_at)}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: <span className="font-mono">{r.training_id}</span>
                    </div>
                  </div>

                  <div className="rounded-full border bg-emerald-50 px-3 py-1 text-xs font-semibold">
                    ✅ Asistió
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
