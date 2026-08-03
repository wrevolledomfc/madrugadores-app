import { useMemo } from "react";
import { cn } from "../lib/cn";
import AppHeader from "../components/AppHeader";

import {
  FaImages,
  FaFolderOpen,
  FaArrowUpRightFromSquare,
  FaClock,
  FaCheck,
  FaVideo,
  FaTrophy,
  FaLayerGroup,
  FaBolt,
} from "react-icons/fa6";

const VIDEO_FECHA_8 =
  "https://drive.google.com/drive/folders/1Z6bL0rqVlqIpgkPXVlS5Gs_hAPg1XDlF";

const FECHAS = [
  { n: 1, titulo: "Fecha 1", driveUrl: "https://drive.google.com/drive/folders/13KUz7SrXsSQQ1reickz-JGK6o5dRM3tS" },
  { n: 2, titulo: "Fecha 2", driveUrl: "https://drive.google.com/drive/folders/1oEOp2uPa_6LKDhTgc42Hi9quGaj3aw5N" },
  { n: 3, titulo: "Fecha 3", driveUrl: "https://drive.google.com/drive/folders/1_sA0JJXFwwshNCiR2HAf0_SbOgxI7Lep" },
  { n: 4, titulo: "Fecha 4", driveUrl: "https://drive.google.com/drive/folders/1CuaKgXmY744x9nDvmtfhdzOTAQm5208g" },
  { n: 5, titulo: "Fecha 5", driveUrl: "https://drive.google.com/drive/folders/1ktEK4-hzwFRMwCsiOm2tbyoCYVs_-pn1" },
  { n: 6, titulo: "Fecha 6", driveUrl: "https://drive.google.com/drive/folders/1RdYO4K9JzpOnavh1ChEJWshgAX2Tp6CN" },
  { n: 7, titulo: "Fecha 7", driveUrl: "https://drive.google.com/drive/folders/1c96RJiVTfrcQ3XbYLwO9xn-93K9XZjhH" },
  { n: 8, titulo: "Fecha 8", driveUrl: "https://drive.google.com/drive/folders/18NzXB-oT0yyX5XOivy-wUHMs15R5C8Qq" },
  { n: 9, titulo: "Fecha 9", driveUrl: "https://drive.google.com/drive/folders/1jmEA5tcw6YWtqS1R_4aax8zGoTW24cjt?usp=sharing" },
  { n: 10, titulo: "Fecha 10", driveUrl: "https://drive.google.com/drive/folders/1QNc8PfAK8oI476qJozt8GaWMv8ts5GwK?usp=sharing" },
  { n: 11, titulo: "Fecha 11", driveUrl: "" },
  { n: 12, titulo: "Fecha 12", driveUrl: "" },
  { n: 13, titulo: "Fecha 13", driveUrl: "" },
  { n: 14, titulo: "Fecha 14", driveUrl: "" },
];

function openDrive(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Fotografias() {
  const disponibles = useMemo(() => FECHAS.filter((f) => !!f.driveUrl), []);

  const ultima = disponibles.length
    ? disponibles[disponibles.length - 1]
    : null;

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-40 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_45%)]" />

        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      {/* 
      <AppHeader
        title="Fotografías"
        subtitle="Álbumes por fecha"
        showInicio={true}
      />
      */}

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Hero superior - glass limpio */}
<section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md sm:p-6">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
        <FaImages className="text-white/60" />
        Galería oficial
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Fotografías
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
        Álbumes oficiales por fecha de Madrugadores. Accede directamente a las
        fotos y videos disponibles de cada jornada.
      </p>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/50">Última fecha</div>
      <div className="mt-1 text-2xl font-extrabold text-white">
        {ultima ? ultima.n : "-"}
      </div>
    </div>
  </div>
</section>
        {/* Estadísticas */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="group rounded-3xl border border-white/12 bg-white/[0.06] p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/25">
                <FaLayerGroup className="text-white/75" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Total
              </span>
            </div>

            <div className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Álbumes
            </div>
            <div className="mt-1 text-4xl font-black tracking-tight">
              {disponibles.length}
            </div>
          </div>

          <div className="group rounded-3xl border border-white/12 bg-white/[0.06] p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/25">
                <FaBolt className="text-white/75" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Activa
              </span>
            </div>

            <div className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Última fecha
            </div>
            <div className="mt-1 text-4xl font-black tracking-tight">
              {ultima ? ultima.n : "-"}
            </div>
          </div>

          <div className="group rounded-3xl border border-white/12 bg-white/[0.06] p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.09]">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/25">
                <FaArrowUpRightFromSquare className="text-white/75" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Drive
              </span>
            </div>

            <div className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Acceso
            </div>
            <div className="mt-2 text-lg font-black">
              Click directo
            </div>
          </div>
        </section>

        {/* Botones principales */}
        <section className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => openDrive(VIDEO_FECHA_8)}
            className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-5 text-left shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.11]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/25">
                  <FaVideo className="text-lg text-white/80" />
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    Material especial
                  </div>
                  <div className="mt-1 text-base font-black">
                    Ver Videos de la Fecha 8
                  </div>
                </div>
              </div>

              <FaArrowUpRightFromSquare className="shrink-0 text-white/50 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white" />
            </div>
          </button>

          {ultima ? (
            <button
              type="button"
              onClick={() => openDrive(ultima.driveUrl)}
              className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-5 text-left shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.11]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/25">
                    <FaImages className="text-lg text-white/80" />
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                      Última galería
                    </div>
                    <div className="mt-1 text-base font-black">
                      Abrir última fecha ({ultima.n})
                    </div>
                  </div>
                </div>

                <FaArrowUpRightFromSquare className="shrink-0 text-white/50 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white" />
              </div>
            </button>
          ) : null}
        </section>

        {/* Título de sección */}
        <div className="flex items-end justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Temporada por fechas
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Selecciona una fecha disponible para abrir su álbum.
            </p>
          </div>
        </div>

        {/* Grid de fechas */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FECHAS.map((f) => {
            const enabled = !!f.driveUrl;

            return (
              <button
                key={f.n}
                type="button"
                onClick={() => openDrive(f.driveUrl)}
                disabled={!enabled}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border p-5 text-left shadow-xl backdrop-blur-xl transition duration-300",
                  enabled
                    ? "border-white/15 bg-white/[0.07] hover:-translate-y-1 hover:bg-white/[0.11]"
                    : "cursor-not-allowed border-white/10 bg-white/[0.035] opacity-45"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-white/10" />
                <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full border border-white/10" />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                      Jornada
                    </div>

                    <div className="mt-2 text-2xl font-black tracking-tight">
                      Fecha {f.n}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-2xl border",
                      enabled
                        ? "border-white/15 bg-black/25 text-white/80"
                        : "border-white/10 bg-black/10 text-white/45"
                    )}
                  >
                    {enabled ? <FaCheck /> : <FaClock />}
                  </div>
                </div>

                <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-black">
                    {f.titulo}
                  </div>

                  <div className="mt-2 text-xs leading-5 text-white/50">
                    {enabled
                      ? "Álbum disponible para abrir en Google Drive."
                      : "Álbum pendiente de publicación."}
                  </div>
                </div>

                <div className="relative mt-5 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  <span className="flex items-center gap-2">
                    <FaFolderOpen />
                    {enabled ? "Disponible" : "Próximamente"}
                  </span>

                  {enabled ? (
                    <FaArrowUpRightFromSquare className="transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
}