import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

export default function RequireAuth({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOk(!!data.session);
    });
  }, []);

  if (ok === null) return <div className="p-6">Cargando…</div>;
  if (!ok) return <Navigate to="/login" replace />;

  return children;
}
