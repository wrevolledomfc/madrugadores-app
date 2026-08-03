import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

/*
  IMPORTANTE:
  El archivo de Google Sheets debe estar configurado como:
  "Cualquier persona con el enlace → Lector"
*/

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
              Consulta todos los estados de cuenta registrados durante el año
              2026.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
          >
            ← Volver al Panel Principal
          </Link>
        </div>

        <Card className="p-5">
          <div className="text-sm font-extrabold">
            Estados de cuenta del año 2026
          </div>

          <div className="mt-2 text-xs text-white/70">
            Presiona el botón para abrir el archivo consolidado de estados de
            cuenta.
          </div>

          <a
            href={ESTADOS_CUENTA_2026_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block"
            title="Abrir estados de cuenta 2026"
          >
            <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-center text-sm font-extrabold transition hover:bg-white/20">
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