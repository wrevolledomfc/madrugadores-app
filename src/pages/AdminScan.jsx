// src/pages/AdminScan.jsx
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

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

  // 🔊 Controles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  const scannerRef = useRef(null);
  const lastQrRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  // WebAudio
  const audioCtxRef = useRef(null);

  const ensureAudio = async () => {
    if (!soundEnabled) return false;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state !== "running") {
        await audioCtxRef.current.resume();
      }
      setAudioReady(true);
      return true;
    } catch {
      return false;
    }
  };

  const rawBeep = async ({ freq = 880, durationMs = 90, type = "sine", gain = 0.06 } = {}) => {
    if (!soundEnabled) return;
    const ok = await ensureAudio();
    if (!ok) return;

    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;

    osc.connect(g);
    g.connect(ctx.destination);

    const t0 = ctx.currentTime;
    osc.start(t0);
    // fade out para evitar click
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);

    osc.stop(t0 + durationMs / 1000);
  };

  // ✅ Beep OK (doble tono “positivo”)
  const beepOk = async () => {
    // dos pitidos ascendentes
    await rawBeep({ freq: 880, durationMs: 70, type: "sine", gain: 0.07 });
    setTimeout(() => {
      rawBeep({ freq: 1175, durationMs: 90, type: "sine", gain: 0.07 });
    }, 90);
  };

  // ❌ Beep Error (mismo para duplicado / fuera de horario / inválido / errores)
  const beepError = async () => {
    // pitido grave más largo y “áspero”
    await rawBeep({ freq: 220, durationMs: 180, type: "square", gain: 0.05 });
  };

  // 🗣️ Voz
  const speak = (text) => {
    if (!voiceEnabled) return;
    try {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-PE"; // si quieres, "es-ES"
      u.rate = 1.02;
      u.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    mountedRef.current = true;
    const safeMsg = (t) => mountedRef.current && setMsg(t);

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
                await beepError();
                return;
              }

              const playerId = payload?.player_id || payload?.user_id;
              if (payload?.type !== "MADRUGADORES_CHECKIN" || !playerId) {
                safeMsg("❌ QR inválido (type/player_id).");
                await beepError();
                return;
              }

              // 2) Training abierto (sirve para mañana o noche igual)
              const { training, error: tErr } = await findOpenTraining();
              if (tErr) {
                safeMsg(`❌ Error buscando entrenamiento: ${tErr.message}`);
                await beepError();
                return;
              }

              if (!training) {
                const nowLima = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
                safeMsg(`⛔ Fuera de horario: no hay entrenamiento abierto para registrar. (Hora Lima: ${nowLima})`);
                setActiveTraining(null);
                await beepError();
                return;
              }

              setActiveTraining(training);

              // 3) Perfil
              const { data: prof, error: pErr } = await supabase
                .from("profiles")
                .select("full_name, dni")
                .eq("id", playerId)
                .single();

              if (pErr || !prof?.full_name || !prof?.dni) {
                safeMsg("⚠️ Socio sin perfil completo (full_name / dni).");
                await beepError();
                return;
              }

              // 4) Insert asistencia
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
                  await beepError(); // ✅ duplicado = error beep
                } else {
                  safeMsg(`❌ No se pudo registrar: ${insErr.message}`);
                  await beepError();
                }
                return;
              }

              // ✅ OK
              setLastOk({ name: prof.full_name, dni: prof.dni, label: training.label });

              safeMsg(`✅ Check-in conforme: ${prof.full_name} (${prof.dni}) — ${training.label}`);

              await beepOk();
              speak(`Check-in conforme, ${prof.full_name}, buen entrenamiento.`);
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
      try {
        window.speechSynthesis?.cancel?.();
      } catch {}
    };
  }, [soundEnabled, voiceEnabled]);

  return (
    <div className="min-h-screen bg-slate-50 p-6" onPointerDown={() => ensureAudio()}>
      <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm border">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Escanear QR (Admin)</h1>

          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            ← Volver al panel
          </Link>
        </div>

        {/* 🔊 Controles */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ensureAudio()}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            title="En móviles/navegadores, el audio suele requerir un toque previo."
          >
            {audioReady ? "🔊 Sonido listo" : "🔊 Activar sonido"}
          </button>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="accent-slate-700"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            Beep
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="accent-slate-700"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
            />
            Voz
          </label>
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

        <p className="mt-3 text-[11px] text-slate-500">
          Nota: En móvil, si no suena, toca “Activar sonido” una vez.
        </p>
      </div>
    </div>
  );
}