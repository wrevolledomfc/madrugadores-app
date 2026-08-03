import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

const ESTADOS_CUENTA_2026_URL =
  "https://docs.google.com/spreadsheets/d/1rsRcVBqpLLSQHmHj21UCiznk6ksNa1L-euAmht2iRnM/view?pli=1&gid=1226416370#gid=1226416370";

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

export default function EstadosCuenta() {
  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Estados de cuenta del Club 2026
            </h1>

            <p className="mt-1 text-sm text-white/70">
              Acceso al archivo consolidado de estados de cuenta del año 2026.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 transition"
          >
            ← Volver Panel Principal
          </Link>
        </div>

        <Card className="p-5">
          <div className="text-sm font-extrabold">
            Estados de cuenta 2026
          </div>

          <div className="mt-2 text-xs text-white/70">
            Presiona el botón para consultar todos los estados de cuenta del año.
          </div>

          <a
            href={ESTADOS_CUENTA_2026_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block"
          >
            <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-5 text-center text-sm font-extrabold hover:bg-white/20 transition">
              TODOS LOS ESTADOS DE CUENTA 2026

              <div className="mt-1 text-xs font-semibold text-white/60">
                Abrir Google Sheets
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}