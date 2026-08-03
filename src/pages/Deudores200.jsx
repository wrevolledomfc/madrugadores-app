import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
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

function moneyPE(n) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return `S/ ${Number(n || 0).toFixed(2)}`;
  }
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("es-PE");
}

export default function Deudores200() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroDeuda, setFiltroDeuda] = useState("200");

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase
        .from("socios_al_dia")
        .select(
          "profile_id, nombre, equipo, estado, deuda, monto_pagado, monto_exigido, updated_at"
        )
        .order("deuda", { ascending: false })
        .order("nombre", { ascending: true });

      if (cancelled) return;

      if (error) {
        setMsg(`No pude cargar los deudores: ${error.message}`);
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    };

    cargar();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (rows || []).filter((r) => {
      const deuda = Number(r?.deuda || 0);

      if (filtroDeuda === "200" && deuda < 200) return false;
      if (filtroDeuda === "100" && deuda < 100) return false;

      if (!q) return true;

      return (
        String(r?.nombre || "").toLowerCase().includes(q) ||
        String(r?.equipo || "").toLowerCase().includes(q) ||
        String(r?.estado || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filtroDeuda]);

  const totalSocios = filteredRows.length;
  const totalDeuda = filteredRows.reduce((acc, r) => acc + Number(r?.deuda || 0), 0);

  const titulo = useMemo(() => {
    if (filtroDeuda === "200") return "Socios con deuda ≥ S/200";
    if (filtroDeuda === "100") return "Socios con deuda ≥ S/100";
    return "Todos los socios";
  }, [filtroDeuda]);

  const subtitulo = useMemo(() => {
    if (filtroDeuda === "200") {
      return "Consulta de socios con deuda acumulada mayor o igual a S/200.";
    }
    if (filtroDeuda === "100") {
      return "Consulta de socios con deuda acumulada mayor o igual a S/100.";
    }
    return "Consulta general de socios desde la tabla socios_al_dia.";
  }, [filtroDeuda]);

  if (loading) return <LoadingScreen text="Cargando deudores..." />;

  return (
    <div className="min-h-screen text-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-2xl font-extrabold">{titulo}</div>
              <div className="mt-1 text-sm text-white/75">
                {subtitulo} Consulta basada en la tabla <b>socios_al_dia</b>.
              </div>
              {msg ? <div className="mt-2 text-sm text-red-200">{msg}</div> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 w-full md:w-auto">
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/70">Total socios</div>
                <div className="text-lg font-extrabold">{totalSocios}</div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/70">Deuda total</div>
                <div className="text-lg font-extrabold">{moneyPE(totalDeuda)}</div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/70">Filtro de deuda</div>
                <select
                  value={filtroDeuda}
                  onChange={(e) => setFiltroDeuda(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="200" className="text-black">
                    Deuda ≥ S/200
                  </option>
                  <option value="100" className="text-black">
                    Deuda ≥ S/100
                  </option>
                  <option value="todos" className="text-black">
                    Todos los socios
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, equipo o estado"
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/45 outline-none focus:border-white/30"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold">Nombre</th>
                  <th className="px-4 py-3 font-bold">Equipo</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold">Deuda</th>
                  <th className="px-4 py-3 font-bold">Pagado</th>
                  <th className="px-4 py-3 font-bold">Exigido</th>
                  <th className="px-4 py-3 font-bold">Actualizado</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-white/70">
                      No hay socios con ese filtro.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.profile_id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold">{r.nombre || "—"}</td>
                      <td className="px-4 py-3">{r.equipo || "—"}</td>
                      <td className="px-4 py-3">{r.estado || "—"}</td>
                      <td className="px-4 py-3 font-extrabold text-red-200">
                        {moneyPE(r.deuda)}
                      </td>
                      <td className="px-4 py-3">{moneyPE(r.monto_pagado)}</td>
                      <td className="px-4 py-3">{moneyPE(r.monto_exigido)}</td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDateTime(r.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}