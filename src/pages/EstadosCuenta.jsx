// src/pages/EstadosCuenta.jsx
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

const ENERO_2026_URL =
  "https://docs.google.com/spreadsheets/d/1rsRcVBqpLLSQHmHj21UCiznk6ksNa1L-euAmht2iRnM/edit?usp=sharing";

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

function MonthButton({ label, href, enabled }) {
  if (enabled && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block"
        title={`Abrir ${label}`}
      >
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold hover:bg-white/15 transition">
          {label}
          <div className="mt-1 text-xs text-white/60 font-semibold">Abrir Sheet</div>
        </div>
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-extrabold text-white/60 cursor-not-allowed">
      {label}
      <div className="mt-1 text-xs text-white/45 font-semibold">Próximamente</div>
    </div>
  );
}

export default function EstadosCuenta() {
  const months = [
    { key: "01", label: "Enero 2026", href: ENERO_2026_URL, enabled: true },
    { key: "02", label: "Febrero 2026", href: "", enabled: false },
    { key: "03", label: "Marzo 2026", href: "", enabled: false },
    { key: "04", label: "Abril 2026", href: "", enabled: false },
    { key: "05", label: "Mayo 2026", href: "", enabled: false },
    { key: "06", label: "Junio 2026", href: "", enabled: false },
    { key: "07", label: "Julio 2026", href: "", enabled: false },
    { key: "08", label: "Agosto 2026", href: "", enabled: false },
    { key: "09", label: "Septiembre 2026", href: "", enabled: false },
    { key: "10", label: "Octubre 2026", href: "", enabled: false },
    { key: "11", label: "Noviembre 2026", href: "", enabled: false },
    { key: "12", label: "Diciembre 2026", href: "", enabled: false },
  ];

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Estados de cuenta del Club 2026</h1>
            <p className="mt-1 text-sm text-white/70">Acceso mensual a los estados de cuenta (Sheets).</p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 transition"
          >
            ← Volver Panel Principal
          </Link>
        </div>
    
        <Card className="p-5">
          <div className="text-sm font-extrabold">Ver Estados de Cuenta a Enero 2026</div>
          <div className="mt-2 text-xs text-white/70">
            Enero está disponible. Los siguientes meses se habilitarán conforme se creen los enlaces.
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {months.map((m) => (
              <MonthButton key={m.key} label={m.label} href={m.href} enabled={m.enabled} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
