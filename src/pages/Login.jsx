// src/pages/Login.jsx
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

/* ✅ ICONOS OFICIALES DE MARCA */
import { FaWhatsapp, FaFacebookF, FaTiktok } from "react-icons/fa";

import bus from "../assets/bus-madrugadores.png";
import logo from "../assets/madrugadores-logo.png";
import superligaBanner from "../assets/superliga-banner-equipos.png";
import SponsorCarousel from "../components/SponsorCarousel";

/* enlaces */
const FACEBOOK_URL = "https://www.facebook.com/Madrugadoresfcoficial/";
const TIKTOK_URL = "https://www.tiktok.com/@madrugadoresfc1?_r=1&_t=ZS-93Yl5P92Q2G";
const WHATSAPP_URL = "https://wa.me/51949175139";

/* Facebook plugin (iframe) */
const FB_PAGE_HREF = "https://www.facebook.com/Madrugadoresfcoficial/";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Facebook embed states
  const [fbLoaded, setFbLoaded] = useState(false);
  const [fbError, setFbError] = useState(false);

  const FB_PLUGIN_SRC = useMemo(() => {
  const width = 500;
  const height = 650;

  return (
    "https://www.facebook.com/plugins/page.php" +
    `?href=${encodeURIComponent(FB_PAGE_HREF)}` +
    "&tabs=timeline" +
    `&width=${width}` +
    `&height=${height}` +
    "&small_header=true" +
    "&adapt_container_width=true" +
    "&hide_cover=false" +
    "&show_facepile=true"
  );
}, []);


  const signIn = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) setMsg(error.message);
    else navigate("/dashboard");
  };

  return (
    <div className="min-h-screen relative bg-slate-950 text-white">
      {/* Fondo bus */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bus})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.16,
        }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8">
        {/* ===== Banner clickeable ===== */}
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
          <a
            href="https://sites.google.com/view/mfc2026"
            target="_blank"
            rel="noreferrer"
            title="Ver datos del campeonato"
            className="block group"
          >
            <img
              src={superligaBanner}
              alt="Superliga"
              className="
                w-full
                max-h-[160px] sm:max-h-[190px] md:max-h-[220px]
                object-cover
                transition
                group-hover:scale-[1.02]
                group-hover:brightness-110
                cursor-pointer
              "
            />
          </a>
        </div>

        {/* ===== Card Login ===== */}
        <div className="mt-6 mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl border border-white/15 bg-white/10 grid place-items-center">
              <img
                src={logo}
                alt="Madrugadores"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div>
              <div className="text-lg font-extrabold tracking-tight">
                Madrugadores FC
              </div>
              <div className="text-sm text-white/75">Inicia sesión</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={signIn} className="mt-5 space-y-3">
            <input
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/45 outline-none focus:ring-2 focus:ring-white/25"
              placeholder="correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <input
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/45 outline-none focus:ring-2 focus:ring-white/25"
              placeholder="clave"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <button
              className="w-full rounded-xl bg-white text-black px-4 py-2 font-extrabold tracking-wide disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {msg && (
              <p className="text-sm text-red-300 font-semibold text-center">
                {msg}
              </p>
            )}
          </form>

          {/* ===== REDES SOCIALES GRANDES ===== */}
          <div className="mt-7 pt-5 border-t border-white/10">
            <p className="text-center text-sm text-white/70 mb-4 font-semibold">
              Síguenos o contáctanos
            </p>

            <div className="flex justify-center gap-7">
              {/* WhatsApp */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                title="WhatsApp"
                className="h-16 w-16 rounded-2xl bg-emerald-500 grid place-items-center shadow-xl shadow-emerald-500/40 hover:scale-110 transition"
              >
                <FaWhatsapp size={34} />
              </a>

              {/* Facebook */}
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                title="Facebook"
                className="h-16 w-16 rounded-2xl bg-blue-600 grid place-items-center shadow-xl shadow-blue-500/40 hover:scale-110 transition"
              >
                <FaFacebookF size={30} />
              </a>

              {/* TikTok */}
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noreferrer"
                title="TikTok"
                className="h-16 w-16 rounded-2xl bg-black border border-white/20 grid place-items-center shadow-xl hover:scale-110 transition"
              >
                <FaTiktok size={30} />
              </a>
            </div>
          </div>
        </div>

        {/* ===== VISTA PREVIA FACEBOOK (DARK + RESPONSIVE) ===== */}
<div className="mt-6 flex justify-center">
  <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-4 shadow-[0_12px_35px_rgba(0,0,0,0.55)]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-extrabold text-white">Facebook</div>
        <div className="text-xs text-white/60">Últimas publicaciones</div>
      </div>

      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-bold rounded-lg bg-blue-600 px-3 py-2 hover:brightness-110 transition"
      >
        Ver en Facebook
      </a>
    </div>

    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/80">
      {/* Contenedor responsive */}
      <div className="w-full flex justify-center relative min-h-[460px] py-3">
        {/* Loader */}
        {!fbLoaded && !fbError && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="h-10 w-10 mx-auto rounded-full border-2 border-white/25 border-t-white animate-spin" />
              <p className="mt-3 text-xs text-white/60">Cargando Facebook…</p>
            </div>
          </div>
        )}

        {/* Wrapper con scale para móvil */}
        <div
          className="
            relative
            origin-top
            w-[500px]
            max-w-full
          "
          style={{
            // Escala automática: si el contenedor es más chico que 500px, se escala.
            // 1) maxWidth: 100% evita desbordes
            // 2) scale calculado con CSS clamp en base a viewport
            //    - en móvil: ~0.72-0.85
            //    - en desktop: 1
            transform: "scale(clamp(0.72, (100vw - 60px)/500, 1))",
          }}
        >
          <iframe
            title="Madrugadores FC Facebook"
            src={FB_PLUGIN_SRC}
            width="500"
            height="650"
            style={{ border: "none", overflow: "hidden", background: "black" }}
            scrolling="no"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setFbLoaded(true)}
            onError={() => setFbError(true)}
            className="rounded-xl"
          />

          {/* Overlay suave para integrar con dark UI */}
          <div className="pointer-events-none absolute inset-0 bg-black/10 rounded-xl" />
        </div>
      </div>

      {/* Fallback */}
      {fbError && (
        <div className="p-6 text-center border-t border-white/10">
          <p className="text-sm text-white/80 font-semibold">
            No se pudo cargar el preview de Facebook en este navegador.
          </p>
          <p className="text-xs text-white/60 mt-2">
            Abre la página directamente desde el botón.
          </p>

          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-4 items-center gap-2 text-sm font-extrabold rounded-xl bg-blue-600 px-4 py-2 hover:brightness-110 transition"
          >
            <FaFacebookF />
            Abrir Facebook
          </a>
        </div>
      )}
    </div>
  </div>
</div>



        {/* ===== Carrusel patrocinadores ===== */}
        <div className="mt-8 mx-auto w-full max-w-3xl">
          <SponsorCarousel
            showTitle
            title="Patrocinadores"
            slidePaddingClassName="p-6"
            imageClassName="max-h-32 sm:max-h-40 md:max-h-44 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
