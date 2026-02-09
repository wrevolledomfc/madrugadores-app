// tools/reset_socios_auth_and_profiles.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const XLSX_PATH = "mfc_socios_to_import_FINAL.xlsx";
const PHOTOS_DIR = path.join("tools", "fotos finales"); // tu carpeta
const BUCKET = "avatars";

// ---------- helpers ----------
function normEmail(x) {
  return String(x || "").trim().toLowerCase();
}

function normDni(x) {
  let s = String(x ?? "").trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  return s.replace(/\s+/g, "");
}

function slugNameForPassword(fullName) {
  // "César Williams Revolledo" -> "cesarwilliamsrevolledo"
  const s = String(fullName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/[^a-z0-9\s]/g, "")     // solo letras/números/espacios
    .replace(/\s+/g, "");            // sin espacios
  return s || "socio";
}

function provisionalPassword(fullName) {
  const first = String(fullName || "")
    .trim()
    .split(/\s+/)[0] // 👈 SOLO PRIMER NOMBRE
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/[^a-z0-9]/g, "");      // solo letras/números

  return `${first}2026`;
}


function contentTypeByExt(ext) {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "application/octet-stream";
}

function findLocalPhotoByEmail(email) {
  // en tu carpeta se ven nombres tipo: "1982sbj@gmail.com.avatar"
  // también puede ser: "email.jpg", "email.webp", "email.png", etc.
  const files = fs.readdirSync(PHOTOS_DIR);

  const candidates = [
    email,
    `${email}.avatar`, // tu caso
    `${email}.webp`,
    `${email}.png`,
    `${email}.jpg`,
    `${email}.jpeg`,
  ];

  for (const c of candidates) {
    const exact = path.join(PHOTOS_DIR, c);
    if (fs.existsSync(exact) && fs.statSync(exact).isFile()) return exact;
  }

  // fallback: "empieza con email."
  const starts = files.find((f) => f.toLowerCase().startsWith(email.toLowerCase() + "."));
  if (starts) return path.join(PHOTOS_DIR, starts);

  return null;
}

async function toWebp512(inputPath) {
  const buf = fs.readFileSync(inputPath);
  // Si tu archivo ".avatar" en realidad es PNG/JPG, sharp lo lee igual por magic bytes
  return sharp(buf)
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 86 })
    .toBuffer();
}

async function listAllUsersByEmail() {
  // Pagina todo (tienes 149 pero igual robusto)
  let page = 1;
  const perPage = 1000;
  const all = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    all.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }

  const map = new Map();
  for (const u of all) {
    const email = (u.email || "").toLowerCase();
    if (!email) continue;
    if (!map.has(email)) map.set(email, []);
    map.get(email).push(u);
  }
  return map;
}

async function deleteAuthUser(userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

// ---------- main ----------
async function main() {
  console.log("📘 Leyendo XLSX:", XLSX_PATH);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // Dedupe en XLSX por email
  const byEmail = new Map();
  for (const r of rows) {
    const email = normEmail(r.email);
    const full_name = String(r.full_name || "").trim();
    if (!email || !full_name) continue;

    // el último gana (si repites email en XLSX)
    byEmail.set(email, {
      email,
      full_name,
      dni: normDni(r.dni),
      equipo: String(r.equipo || "").trim(),
    });
  }

  const items = Array.from(byEmail.values());
  console.log("🧾 Socios únicos por email (XLSX):", items.length);

  console.log("🔎 Listando usuarios actuales en Auth...");
  const authMap = await listAllUsersByEmail();

  let ok = 0, fail = 0, deleted = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const pass = provisionalPassword(it.full_name);

    try {
      // 1) borrar duplicados existentes por email (y/o el único)
      const existing = authMap.get(it.email) || [];
      if (existing.length) {
        for (const u of existing) {
          await deleteAuthUser(u.id);
          deleted++;
          console.log(`[${i + 1}/${items.length}] 🗑️ BORRADO auth: ${it.email} (${u.id})`);
        }
      }

      // 2) crear nuevo auth user
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: it.email,
        password: pass,
        email_confirm: true,
        user_metadata: {
          full_name: it.full_name,
          name: it.full_name,       // para que el dashboard lo muestre
          display_name: it.full_name,
          dni: it.dni,
          equipo: it.equipo,
        },
      });
      if (createErr) throw createErr;
      const userId = created.user.id;

      // 3) upsert profile
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: it.full_name,
        role: "socio",
        email: it.email,
        dni: it.dni,
        equipo: it.equipo,
      });
      if (profErr) throw profErr;

      // 4) avatar desde archivo local
      const photoPath = findLocalPhotoByEmail(it.email);
      if (!photoPath) {
        console.log(`[${i + 1}/${items.length}] ⚠️ SIN FOTO local: ${it.email} (pero usuario creado)`);
      } else {
        const avatarWebp = await toWebp512(photoPath);
        const storagePath = `${userId}/avatar.webp`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, avatarWebp, {
          contentType: "image/webp",
          upsert: true,
        });
        if (upErr) throw upErr;

        const { error: auErr } = await supabase
          .from("profiles")
          .update({ avatar_url: storagePath })
          .eq("id", userId);
        if (auErr) throw auErr;
      }

      console.log(`[${i + 1}/${items.length}] ✅ OK: ${it.email} pass=${pass}`);
      ok++;
    } catch (e) {
      console.error(`[${i + 1}/${items.length}] ❌ ERROR ${it.email}:`, e?.message || e);
      fail++;
    }
  }

  console.log("\n✅ Terminado");
  console.log(`🗑️ borrados: ${deleted}`);
  console.log(`✅ ok: ${ok}`);
  console.log(`❌ fail: ${fail}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
