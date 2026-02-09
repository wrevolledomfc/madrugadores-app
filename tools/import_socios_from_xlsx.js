// tools/import_socios_from_xlsx.js
import fs from "fs";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

/**
 * ✅ Qué hace:
 * - Lee XLSX (root) con columnas: full_name, email, dni, equipo, role
 * - Dedup por email (último gana)
 * - Carga Auth users 1 sola vez (listUsers paginado) y arma Map(email -> id)
 * - Si existe en Auth -> borra profile y borra auth user
 * - Borra profile huérfano por email
 * - Crea Auth user (password = primerNombre + 2026)
 * - Upsert en public.profiles (id = auth.user.id)
 */

// =====================
// ENV / CONFIG
// =====================
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://pooxgubeeeohvpnjwltg.supabase.co";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3hndWJlZWVvaHZwbmp3bHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI3NzIwNywiZXhwIjoyMDgyODUzMjA3fQ.Or7y7V3t4EwQ4d0xkXT0fkGV0UrI-VCJmlqESLFg-N8";

// ✅ Validación correcta (no uses startsWith con el JWT real)
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.length < 40) {
  throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (service role).");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ✅ Cambia acá tu archivo
const XLSX_PATH = "mfc_socios_to_import_FINAL16.xlsx";

// =====================
// HELPERS
// =====================
function provisionalPassword(fullName) {
  const first = String(fullName || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${first}2026`;
}

function normEmail(x) {
  return String(x || "").trim().toLowerCase();
}

function normDni(x) {
  let s = String(x ?? "").trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}

function normText(x) {
  return String(x ?? "").trim();
}

async function deleteAuthUser(userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

async function deleteProfileById(userId) {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
}

async function deleteProfileByEmail(email) {
  const e = normEmail(email);
  if (!e) return;
  const { error } = await supabase.from("profiles").delete().ilike("email", e);
  if (error) throw error;
}

// ✅ Cargar TODOS los auth users una sola vez y mapear email->id
async function buildAuthEmailMap() {
  const map = new Map();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    for (const u of users) {
      if (u?.email) map.set(normEmail(u.email), u.id);
    }

    if (users.length < perPage) break;
    page++;
  }

  return map;
}

// =====================
// MAIN
// =====================
async function main() {
  console.log("📌 XLSX:", XLSX_PATH);

  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`No encuentro el XLSX: ${XLSX_PATH}. Debe estar en la raíz del proyecto.`);
  }

  // 0) Cargar mapa auth una sola vez
  console.log("👤 Cargando usuarios Auth (listUsers) ...");
  const authMap = await buildAuthEmailMap();
  console.log(`👤 Auth cargados: ${authMap.size}`);

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const items = rows.map((r) => ({
    full_name: normText(r.full_name),
    email: normEmail(r.email),
    dni: normDni(r.dni),
    equipo: normText(r.equipo),
    role: normText(r.role) || "socio",
  }));

  // Dedup por email (último gana)
  const mapByEmail = new Map();
  for (const it of items) {
    if (!it.email) continue;
    mapByEmail.set(it.email, it);
  }
  const deduped = Array.from(mapByEmail.values());

  console.log("📦 Filas originales:", items.length);
  console.log("🧹 Filas deduplicadas:", deduped.length);

  for (let i = 0; i < deduped.length; i++) {
    const it = deduped[i];
    const n = i + 1;
    const total = deduped.length;

    if (!it.email || !it.full_name) {
      console.log(`[${n}/${total}] SKIP falta email/nombre`);
      continue;
    }
    if (!it.equipo) {
      console.log(`[${n}/${total}] SKIP sin equipo -> ${it.email}`);
      continue;
    }

    const pass = provisionalPassword(it.full_name);

    try {
      // 1) Si existe en Auth -> borrar y recrear
      let userId = authMap.get(it.email) || null;

      if (userId) {
        console.log(`[${n}/${total}] EXISTE AUTH -> borrando: ${it.email}`);

        await deleteProfileById(userId);
        await deleteAuthUser(userId);

        authMap.delete(it.email); // mantener map consistente
        userId = null;
      }

      // 2) borrar profile huérfano por email (si existe)
      await deleteProfileByEmail(it.email);

      // 3) crear auth
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: it.email,
        password: pass,
        email_confirm: true,
        user_metadata: {
          full_name: it.full_name,
          dni: it.dni,
          equipo: it.equipo,
          role: it.role,
        },
      });
      if (createErr) throw createErr;

      userId = created.user.id;
      authMap.set(it.email, userId);

      console.log(`[${n}/${total}] ✅ AUTH creado: ${it.email} pass=${pass}`);

      // 4) upsert profile
      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: it.full_name,
          role: it.role || "socio",
          email: it.email,
          dni: it.dni,
          equipo: it.equipo,
          avatar_url: null,
        },
        { onConflict: "id" }
      );
      if (profErr) throw profErr;

      console.log(`[${n}/${total}] ✅ OK profile (sin foto): ${it.email}`);
    } catch (e) {
      console.error(`[${n}/${total}] ❌ ERROR ${it.email}:`, e?.message || e);
    }
  }

  console.log("✅ Terminado");
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
