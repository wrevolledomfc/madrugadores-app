// src/pages/Fotografias.jsx
import { useMemo, useState } from "react";
import { cn } from "../lib/cn";

const FECHAS = [
  {
    n: 1,
    titulo: "Fecha 1 – Apertura",
    // ✅ Tu link actual (carpeta Drive)
    driveUrl: "https://drive.google.com/drive/folders/13KUz7SrXsSQQ1reickz-JGK6o5dRM3tS?usp=sharing",
  },
  // 👉 Completa cuando tengas los links (por ahora quedan placeholders)
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

// Convierte URL de carpeta Drive a "embed" (si Drive lo permite)
function toDriveEmbed(url) {
  try {
    const u = new URL(url);
    // folder id suele estar en /folders/<ID>
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("folders");
    const folderId = idx >= 0 ? parts[idx + 1] : null;
    if (!folderId) return null;

    // Intento de embed. Si Drive bloquea, usamos fallback.
    // Nota: Google puede bloquear iframes de folders. Por eso manejamos error.
    return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
  } catch {
    return null;
  }
}

export default function Fotografias() {
  const [selected, setSelected] = useState(1);
  const [embedOk, setEmbedOk] = useState(true);

  const item = useMemo(() => FECHAS.find((x) => x.n === selected) || FECHAS[0], [selected]);

  const embedSrc = useMemo(() => (item?.driveUrl ? toDriveEmbed(item.driveUrl) : null), [item]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Fotografías</h1>
            <p className="mt-1 text-sm text-white/70">
              Selecciona una fecha. Las fotos se muestran desde Google Drive (sin importar archivos al proyecto).
            </p>
          </div>

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

        {/* Botones fechas */}
        <div className="mt-5 flex flex-wrap gap-2">
          {FECHAS.map((f) => {
            const disabled = !f.driveUrl;
            const active = f.n === selected;

            return (
              <button
                key={f.n}
                onClick={() => {
                  if (!disabled) {
                    setSelected(f.n);
                    setEmbedOk(true);
                  }
                }}
                disabled={disabled}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-extrabold transition",
                  active ? "bg-emerald-500/20 border-emerald-300/30 text-emerald-50" : "bg-white/10 border-white/15 text-white/85 hover:bg-white/15",
                  disabled && "opacity-40 cursor-not-allowed hover:bg-white/10"
                )}
                title={disabled ? "Falta link de esta fecha" : f.titulo}
              >
                Fecha {f.n}
              </button>
            );
          })}
        </div>

        {/* Visor */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-extrabold">{item?.titulo || `Fecha ${selected}`}</div>
            <div className="text-xs text-white/60">
              {embedSrc && embedOk ? "Vista previa en la web" : "Vista previa no disponible en iframe (abre en Drive)"}
            </div>
          </div>

          <div className="relative min-h-[520px]">
            {/* Si hay embed y Drive lo permite */}
            {embedSrc && embedOk ? (
              <iframe
                title={`Galeria Fecha ${selected}`}
                src={embedSrc}
                className="absolute inset-0 w-full h-full"
                style={{ border: "0" }}
                loading="lazy"
                onError={() => setEmbedOk(false)}
              />
            ) : (
              <div className="p-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                  <div className="text-sm font-extrabold">No se pudo mostrar la galería aquí.</div>
                  <div className="mt-2 text-xs text-white/70">
                    Google Drive a veces bloquea la vista previa en iframes. Ábrela con el botón para ver todas las fotos en galería.
                  </div>

                  {item?.driveUrl ? (
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-4 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold hover:brightness-110 transition"
                    >
                      Ver fotos en Drive
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nota */}
        <div className="mt-4 text-xs text-white/60">
          Tip: Si quieres un visor 100% estable dentro de la app (sin bloqueos), lo ideal es crear un{" "}
          <b>Álbum compartido en Google Photos</b> y pasarme ese link por fecha. Ahí sí queda embebido perfecto.
        </div>
      </div>
    </div>
  );
}