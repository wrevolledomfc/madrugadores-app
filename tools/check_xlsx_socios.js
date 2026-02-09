// tools/check_xlsx_socios.js
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const XLSX_PATH = "mfc_socios_to_import_FINAL.xlsx";
const KITS_DIR = path.join("src", "assets", "kits");
const CRESTS_DIR = path.join("src", "assets", "crests");

function slugTeam(t) {
  const raw = String(t || "").trim();

  const fixes = {
    "indpendiente": "independiente",
    "independiente": "independiente",
  };

  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-");

  return fixes[normalized] || normalized;
}


function existsP(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error("❌ No existe:", XLSX_PATH);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  console.log("✅ XLSX:", XLSX_PATH);
  console.log("✅ Filas:", rows.length);

  const first = rows[0] || {};
  const headers = Object.keys(first);
  console.log("✅ Headers detectados:", headers);

  const required = ["full_name", "email", "dni", "equipo", "photo_url"];
  const missingCols = required.filter((k) => !headers.includes(k));
  if (missingCols.length) {
    console.log("⚠️ Faltan columnas:", missingCols);
  } else {
    console.log("✅ Columnas requeridas: OK");
  }

  const equipos = new Map(); // slug -> original
  for (const r of rows) {
    const eq = String(r.equipo || "").trim();
    if (!eq) continue;
    const slug = slugTeam(eq);
    if (!equipos.has(slug)) equipos.set(slug, eq);
  }

  console.log("\n✅ Equipos únicos:", equipos.size);
  const missing = [];

  for (const [slug, original] of equipos.entries()) {
    const kitPath = path.join(KITS_DIR, `${slug}.png`);
    const crestPath = path.join(CRESTS_DIR, `${slug}.png`);
    const kitOk = existsP(kitPath);
    const crestOk = existsP(crestPath);

    if (!kitOk || !crestOk) {
      missing.push({ original, slug, kitOk, crestOk });
    }
  }

  if (missing.length) {
    console.log("\n❌ FALTAN ASSETS PARA ESTOS EQUIPOS:");
    for (const m of missing) {
      console.log(
        `- equipo="${m.original}" slug="${m.slug}" | kit=${m.kitOk ? "OK" : "FALTA"} | crest=${
          m.crestOk ? "OK" : "FALTA"
        }`
      );
    }
    process.exitCode = 2;
  } else {
    console.log("\n✅ Kits y crests: TODO OK para todos los equipos del Excel.");
  }

  // Muestra 3 filas de ejemplo para ver photo_url
  console.log("\nMuestra filas (3):");
  console.log(
    rows.slice(0, 3).map((r) => ({
      full_name: r.full_name,
      email: r.email,
      dni: r.dni,
      equipo: r.equipo,
      photo_url: String(r.photo_url || "").slice(0, 60) + (String(r.photo_url || "").length > 60 ? "..." : ""),
    }))
  );
}

main();
