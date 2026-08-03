import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import AppHeader from "../components/AppHeader";
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

function SoftLink({ className, ...props }) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition",
        className
      )}
      {...props}
    />
  );
}

export default function Catalogo() {
  const pdfUrl = "/catalogo-abril-2026-mfc.pdf";

  return (
    <div className="min-h-screen text-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">Catálogo de Beneficios</h1>
              <p className="mt-1 text-sm text-white/75">
                Revisa todos los descuentos y beneficios vigentes para Madrugadores FC.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition"
              >
                Volver al Dashboard
              </Link>

              <SoftLink href={pdfUrl} target="_blank" rel="noreferrer">
                Abrir en pestaña nueva
              </SoftLink>

              <SoftLink href={pdfUrl} download>
                Descargar PDF
              </SoftLink>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-2">
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
            <iframe
              src={`${pdfUrl}#view=FitH`}
              title="Catálogo de Beneficios Madrugadores FC"
              className="w-full h-[78vh] bg-white"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}