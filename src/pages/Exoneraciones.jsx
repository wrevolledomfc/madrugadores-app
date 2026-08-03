import { Link } from "react-router-dom";

const EXONERACIONES_DRIVE_URL =
  "https://drive.google.com/drive/folders/1omDW9vx9sIaHoHyEx3hxaIeLq0Ir_7C-?usp=sharing";

export default function Exoneraciones() {
  return (
    <div className="min-h-screen text-white pb-20">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold">Exoneraciones</h1>
              <p className="text-sm text-white/70">
                Consulta los documentos oficiales de exoneración.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              Volver
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-5 shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
          <div className="text-lg font-extrabold">
            Ver Exoneraciones
          </div>

          <div className="mt-2 text-sm text-white/75">
            Accede directamente a la carpeta de Drive donde se encuentran las
            exoneraciones registradas.
          </div>

          <a
            href={EXONERACIONES_DRIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold text-white hover:bg-white/15 transition sm:w-auto"
          >
            Abrir carpeta de exoneraciones
          </a>
        </div>
      </main>
    </div>
  );
}