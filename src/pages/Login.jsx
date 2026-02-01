// src/pages/Login.jsx
import { useState } from "react";
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
const WHATSAPP_URL = "https://wa.me/5194917539";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
              <img src={logo} alt="Madrugadores" className="h-9 w-9 object-contain" />
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
            />

            <input
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder:text-white/45 outline-none focus:ring-2 focus:ring-white/25"
              placeholder="clave"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="w-full rounded-xl bg-white text-black px-4 py-2 font-extrabold tracking-wide disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {msg && (
              <p className="text-sm text-red-300 font-semibold text-center">{msg}</p>
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
