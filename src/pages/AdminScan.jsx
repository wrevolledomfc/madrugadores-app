// src/pages/AdminScan.jsx
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

// YYYY-MM-DD en hora Lima
function limaYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function formatLimaDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima" });
  } catch {
    return String(iso);
  }
}

export default function AdminScan() {
  const [msg, setMsg] = useState("Apunta la cámara al QR del socio.");
  const [activeTraining, setActiveTraining] = useState(null);
  const [lastOk, setLastOk] = useState(null);

  const scannerRef = useRef(null);
  const lastQrRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const safeMsg = (t) => mountedRef.current && setMsg(t);

    // ✅ Trae trainings de HOY (Lima) y encuentra el que esté abierto ahora
    const findOpenTraining = async () => {
  const { data, error } = await supabase.rpc("get_open_training");
  if (error) return { training: null, error };

  const training = Array.isArray(data) ? data[0] : data;
  return { training: training || null, error: null };
};




    const start = async () => {
      try {
        safeMsg("Iniciando cámara…");

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (!mountedRef.current) return;
            if (busyRef.current) return;
            if (decodedText === lastQrRef.current) return;

            busyRef.current = true;
            lastQrRef.current = decodedText;

            try {
              // 1) Parse QR
              let payload;
              try {
                payload = JSON.parse(decodedText);
              } catch {
                safeMsg("❌ QR inválido (formato).");
                return;
              }

              const playerId = payload?.player_id || payload?.user_id;
              if (payload?.type !== "MADRUGADORES_CHECKIN" || !playerId) {
                safeMsg("❌ QR inválido (type/player_id).");
                return;
              }

              // 2) Training abierto ahora
              const { training, error: tErr } = await findOpenTraining();
              if (tErr) {
                safeMsg(`❌ Error buscando entrenamiento: ${tErr.message}`);
                return;
              }

              if (!training) {
                const nowLima = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
                safeMsg(`⛔ Fuera de horario: no hay entrenamiento abierto para registrar. (Hora Lima: ${nowLima})`);
                setActiveTraining(null);
                return;
              }

              setActiveTraining(training);

              // 3) Validar perfil socio
              const { data: prof, error: pErr } = await supabase
                .from("profiles")
                .select("full_name, dni")
                .eq("id", playerId)
                .single();

              if (pErr || !prof?.full_name || !prof?.dni) {
                safeMsg("⚠️ Socio sin perfil completo (full_name / dni).");
                return;
              }

              // 4) Registrar asistencia
              const { error: insErr } = await supabase.from("attendance").insert({
                training_id: training.id,
                player_id: playerId,
                attended: true,
                scanned_at: new Date().toISOString(),
              });

              if (insErr) {
                const m = (insErr.message || "").toLowerCase();
                if (m.includes("duplicate") || m.includes("unique")) {
                  safeMsg(`🟡 Ya estaba registrado en este entrenamiento: ${prof.full_name}`);
                } else {
                  safeMsg(`❌ No se pudo registrar: ${insErr.message}`);
                }
                return;
              }

              setLastOk({ name: prof.full_name, dni: prof.dni, label: training.label });

              safeMsg(`✅ Registrado: ${prof.full_name} (${prof.dni}) — ${training.label}`);
            } finally {
              setTimeout(() => (busyRef.current = false), 1200);
            }
          },
          () => {}
        );

        safeMsg("Cámara lista. Escanea el QR.");
      } catch {
        safeMsg("❌ No pude iniciar la cámara. Revisa permisos y HTTPS/localhost.");
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {}).finally(() => s.clear());
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm border">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Escanear QR (Admin)</h1>

          {/* ✅ Botón volver al panel */}
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            ← Volver al panel
          </Link>
        </div>

        <p className="mt-2 text-sm text-slate-600">{msg}</p>

        {activeTraining && (
          <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-sm">
            <div className="font-semibold">Entrenamiento abierto</div>
            <div>{activeTraining.label}</div>
            <div className="text-slate-600">
              {activeTraining.training_date} — {String(activeTraining.start_time || "").slice(0, 5)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Abre: {formatLimaDateTime(activeTraining.checkin_open_at)} <br />
              Cierra: {formatLimaDateTime(activeTraining.checkin_close_at)}
            </div>
          </div>
        )}

        {lastOk && (
          <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-sm">
            <div className="font-semibold">Último OK</div>
            <div>{lastOk.name} — {lastOk.dni}</div>
            <div className="text-slate-600">{lastOk.label}</div>
          </div>
        )}

        <div className="mt-4 rounded-xl border p-2 bg-white">
          <div id="qr-reader" />
        </div>
      </div>
    </div>
  );
}
