import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RequireAdmin({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return (window.location.href = "/login");

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = String(prof?.role || "").toLowerCase() === "admin";
      setOk(isAdmin);
      if (!isAdmin) window.location.href = "/dashboard";
    })();
  }, []);

  if (ok === null) return null;
  return children;
}
