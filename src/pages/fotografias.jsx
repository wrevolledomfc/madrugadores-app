// src/pages/Fotografias.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

const FECHAS = [
  {
    n: 1,
    titulo: "Fecha 1 – Apertura",
    driveUrl: "https://drive.google.com/drive/folders/13KUz7SrXsSQQ1reickz-JGK6o5dRM3tS?usp=sharing",
  },
  { n: 2, titulo: "Fecha 2", driveUrl: "" },
  { n: 3, titulo: "Fecha 3", driveUrl: "" },
  { n: 4, titulo: "Fecha 4", driveUrl: "" },
  { n: 5, titulo: "Fecha 5", driveUrl: "" },
  { n: 6, titulo: "Fecha 6", driveUrl: "" },
  { n: 7, titulo: "Fecha 7", driveUrl: "" },
  { n: 8, titulo: "Fecha 8", driveUrl: "" },
  { n: 9, titulo: "Fecha 9", driveUrl: "" },
  { n: 10, titulo: "Fecha 10", driveUrl: "" },
  { n: 11, titulo: "Fecha 11", driveUrl: "" },
  { n: 12, titulo: "Fecha 12", driveUrl: "" },
  { n: 13, titulo: "Fecha 13", driveUrl: "" },
  { n: 14, titulo: "Fecha 14", driveUrl: "" },
];

export default function Fotografias() {
  const firstAvailable = useMemo(() => FECHAS.find((f) => !!f.driveUrl)?.n || 1, []);
  const [selected, setSelected] = useState(firstAvailable);

  const item = useMemo(() => FECHAS.find((x) => x.n === selected) || FECHAS[0], [selected]);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Fotografías</h1>
            <p className="mt-1 text-sm text-white/70">
              Selecciona una fecha. Se abren las fotos desde Google Drive (sin importar archivos a la app).
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15 transition"
            >
              ← Volver
            </Link>

            {item?.driveUrl ? (
              <a
                href={item.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white text-black px-4 py-2 text-sm font-extrabold hover:opacity-90 transition"
              >
                Abrir álbum (Drive)
              </a>
            ) : null}
          </div>
        </div>

        {/* Botones fechas */}
        <div className="mt-5 flex flex-wrap gap-2">
          {FECHAS.map((f) => {
            const disabled = !f.driveUrl;
            const active = f.n === selected;

            return (
              <button
                key={f.n}
                onClick={() => !disabled && setSelected(f.n)}
                disabled={disabled}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-extrabold transition",
                  active
                    ? "bg-emerald-500/20 border-emerald-300/30 text-emerald-50"
                    : "bg-white/10 border-white/15 text-white/85 hover:bg-white/15",
                  disabled && "opacity-40 cursor-not-allowed hover:bg-white/10"
                )}
                title={disabled ? "Falta link de esta fecha" : f.titulo}
              >
                Fecha {f.n}
              </button>
            );
          })}
        </div>

        {/* Panel info (sin iframe para evitar pantalla en blanco) */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-extrabold">{item?.titulo || `Fecha ${selected}`}</div>
            <div className="text-xs text-white/60">
              Vista dentro de la app desactivada para evitar bloqueos/errores de Google Drive.
            </div>
          </div>

          <div className="p-6">
            {item?.driveUrl ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-extrabold">Álbum disponible ✅</div>
                <div className="mt-2 text-xs text-white/70">
                  Se abrirá en una nueva pestaña con todas las fotos en calidad original.
                </div>

                <a
                  href={item.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-4 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold hover:brightness-110 transition"
                >
                  Ver fotos en Drive
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-sm font-extrabold">Aún no hay link para esta fecha</div>
                <div className="mt-2 text-xs text-white/70">
                  Cuando me pases el link de Drive de la fecha {selected}, lo activamos.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-white/60">
          Si quieres visor embebido “tipo galería” dentro de la app sin fallos: lo más estable es{" "}
          <b>Google Photos (álbum compartido)</b>. Me pasas el link de cada fecha y lo dejamos incrustado.
        </div>
      </div>
    </div>
  );
}