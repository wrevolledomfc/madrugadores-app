// tools/download_photos_from_xlsx.js
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const XLSX_PATH = "mfc_socios_to_import_FINAL.xlsx";
const OUT_DIR = path.join("tools", "photos_raw");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function normEmail(x) {
  return String(x || "").trim().toLowerCase();
}

function safeFilenameEmail(email) {
  // Windows ok con @ . - _  | Quitamos espacios y cosas raras por si acaso
  return email.replace(/[^a-z0-9@._-]/gi, "_");
}

// Google Drive share -> direct download
function driveToDirect(url) {
  const u = String(url || "").trim();
  if (!u) return "";

  const m1 = u.match(/\/file\/d\/([^/]+)/);
  if (m1?.[1]) return `https://drive.google.com/uc?export=download&id=${m1[1]}`;

  const m2 = u.match(/[?&]id=([^&]+)/);
  if (m2?.[1]) return `https://drive.google.com/uc?export=download&id=${m2[1]}`;

  return u;
}

function looksLikeHtml(buf, contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("text/html")) return true;
  const head = buf.slice(0, 300).toString("utf8").toLowerCase();
  return head.includes("<html") || head.includes("<!doctype html");
}

function extFromContentType(ct) {
  const c = String(ct || "").toLowerCase();
  if (c.includes("image/png")) return "png";
  if (c.includes("image/webp")) return "webp";
  if (c.includes("image/jpeg") || c.includes("image/jpg")) return "jpg";
  return ""; // desconocido
}

async function downloadImage(url) {
  const direct = driveToDirect(url);
  if (!direct) throw new Error("photo_url vacío");

  // 1) intento normal
  let res = await fetch(direct, { redirect: "follow" });
  let buf = Buffer.from(await res.arrayBuffer());
  let ct = res.headers.get("content-type") || "";

  // 2) si llega HTML, suele ser Drive no público o confirm token
  if (looksLikeHtml(buf, ct)) {
    const html = buf.toString("utf8");
    const confirm = html.match(/confirm=([0-9A-Za-z_]+)/)?.[1];
    const id = direct.match(/[?&]id=([^&]+)/)?.[1];

    if (confirm && id) {
      const url2 = `https://drive.google.com/uc?export=download&id=${id}&confirm=${confirm}`;
      res = await fetch(url2, { redirect: "follow" });
      buf = Buffer.from(await res.arrayBuffer());
      ct = res.headers.get("content-type") || "";
    }
  }

  if (looksLikeHtml(buf, ct)) {
    throw new Error("Drive devolvió HTML (link no público o requiere login)");
  }

  const ext = extFromContentType(ct);
  if (!ext) {
    // fallback: intenta adivinar por “magic bytes” mínimos
    const b0 = buf[0], b1 = buf[1], b2 = buf[2], b3 = buf[3];
    // JPG: FF D8
    if (b0 === 0xff && b1 === 0xd8) return { buf, ext: "jpg", ct };
    // PNG: 89 50 4E 47
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return { buf, ext: "png", ct };
    // WEBP: "RIFF" .... "WEBP"
    const head = buf.slice(0, 16).toString("ascii");
    if (head.startsWith("RIFF") && head.includes("WEBP")) return { buf, ext: "webp", ct };

    throw new Error(`No pude detectar tipo imagen. content-type="${ct || "unknown"}"`);
  }

  return { buf, ext, ct };
}

async function main() {
  ensureDir(OUT_DIR);

  console.log("✅ XLSX:", XLSX_PATH);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  console.log("✅ Filas:", rows.length);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const email = normEmail(r.email);
    const url = String(r.photo_url || "").trim();

    const tag = `[${i + 1}/${rows.length}]`;

    if (!email || !url) {
      console.log(`${tag} SKIP falta email o photo_url`);
      continue;
    }

    const base = safeFilenameEmail(email);
    try {
      const { buf, ext } = await downloadImage(url);

      // Si ya existe, no re-descarga (para reintentos)
      const outPath = path.join(OUT_DIR, `${base}.${ext}`);
      if (fs.existsSync(outPath)) {
        console.log(`${tag} OK (ya existe) -> ${path.basename(outPath)}`);
        ok++;
        continue;
      }

      fs.writeFileSync(outPath, buf);
      console.log(`${tag} OK -> ${path.basename(outPath)} (${Math.round(buf.length / 1024)} KB)`);
      ok++;
    } catch (e) {
      console.log(`${tag} ❌ FAIL ${email} -> ${e?.message || e}`);
      fail++;
    }
  }

  console.log(`\n✅ Terminado. OK=${ok} FAIL=${fail}`);
  console.log(`📁 Carpeta: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
