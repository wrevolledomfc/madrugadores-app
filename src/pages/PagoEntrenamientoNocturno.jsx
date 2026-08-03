import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import LoadingScreen from "../components/LoadingScreen";
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

function SoftInput({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white placeholder:text-white/45 outline-none focus:border-white/30",
        className
      )}
      {...props}
    />
  );
}

function SoftButton({ className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15 active:scale-[0.99] transition disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

function ymd(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hhmm(date) {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getThursdayOfCurrentWeek() {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);

  const dow = d.getDay();
  const diffToMonday = (dow === 0 ? -6 : 1) - dow;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);

  return thursday;
}

function getNextThursdayCandidateDates() {
  const thisThursday = getThursdayOfCurrentWeek();
  const nextThursday = addDays(thisThursday, 7);
  const nextNextThursday = addDays(thisThursday, 14);

  return [thisThursday, nextThursday, nextNextThursday].map(ymd);
}

function formatDatePE(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("es-PE");
  } catch {
    return String(dateStr);
  }
}

function buildOperationDatetime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00-05:00`;
}

function sanitizeFileName(name = "") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function parseSupabaseError(err) {
  const msg = String(err?.message || err || "");

  if (msg.toLowerCase().includes("row-level security")) {
    return "Supabase bloqueó la operación por políticas RLS. Revisa las policies del bucket o de la tabla.";
  }

  if (msg.toLowerCase().includes("duplicate")) {
    return "Ya existe un pago registrado para este entrenamiento.";
  }

  if (msg.toLowerCase().includes("mime")) {
    return "El tipo de archivo no está permitido en el bucket.";
  }

  if (msg.toLowerCase().includes("permission")) {
    return "No tienes permisos suficientes para subir el archivo o registrar el pago.";
  }

  return msg || "Ocurrió un error inesperado.";
}

export default function PagoEntrenamientoNocturno() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState(null);
  const [training, setTraining] = useState(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [existingPayment, setExistingPayment] = useState(null);

  const [amount, setAmount] = useState("20.00");
  const [bank, setBank] = useState("");
  const [operationNumber, setOperationNumber] = useState("");
  const [operationDate, setOperationDate] = useState(ymd(new Date()));
  const [operationTime, setOperationTime] = useState(hhmm(new Date()));
  const [receiptFile, setReceiptFile] = useState(null);

  const thursdayCandidates = useMemo(() => getNextThursdayCandidateDates(), []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setMsg("");

        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        setUserId(user.id);

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, dni, equipo, role")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p?.id) throw new Error("No pude cargar tu perfil.");
        setProfile(p);

let foundTraining = null;

for (const candidateDate of thursdayCandidates) {
  const { data, error } = await supabase
    .from("trainings")
    .select("id, training_date, start_time, label, location")
    .eq("training_date", candidateDate)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Error consultando trainings: ${error.message}`);
  }

  if (Array.isArray(data) && data.length > 0) {
    const nocturno =
      data.find((x) => String(x.start_time).startsWith("19:00")) ||
      data.find((x) => String(x.label || "").toLowerCase().includes("7pm")) ||
      data.find((x) => String(x.label || "").toLowerCase().includes("nocturno")) ||
      data[0];

    if (nocturno?.id) {
      foundTraining = nocturno;
      break;
    }
  }
}

        if (!foundTraining?.id) {
          throw new Error(
            `No encontré entrenamiento nocturno. Fechas jueves evaluadas: ${thursdayCandidates.join(
              ", "
            )}. Hora buscada: 19:00:00`
          );
        }

        setTraining(foundTraining);

        const { data: existing, error: eErr } = await supabase
          .from("pagoentrenamiento")
          .select(
            "id, amount, bank, operation_number, operation_date, operation_time, receipt_path, created_at"
          )
          .eq("training_id", foundTraining.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (eErr) throw eErr;

        if (existing?.id) {
          setAlreadyPaid(true);
          setExistingPayment(existing);
        } else {
          setAlreadyPaid(false);
          setExistingPayment(null);
        }
      } catch (e) {
        setMsg(`Error: ${parseSupabaseError(e)}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [thursdayCandidates]);

  const submit = async (e) => {
    e.preventDefault();

    let uploadedPath = null;

    try {
      setSaving(true);
      setMsg("");

      if (!profile?.id) throw new Error("No pude cargar tu perfil.");
      if (!training?.id) throw new Error("No hay entrenamiento nocturno configurado.");
      if (alreadyPaid) throw new Error("Ya registraste tu pago para este entrenamiento.");
      if (!receiptFile) throw new Error("Debes adjuntar el comprobante.");
      if (!bank.trim()) throw new Error("Debes indicar el banco.");
      if (!operationNumber.trim()) throw new Error("Debes indicar el número de operación.");
      if (!operationDate) throw new Error("Debes indicar la fecha de operación.");
      if (!operationTime) throw new Error("Debes indicar la hora de operación.");

      const amountNum = Number(String(amount).replace(",", "."));
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new Error("El monto no es válido.");
      }

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedMimeTypes.includes(receiptFile.type)) {
        throw new Error("El comprobante debe ser JPG, PNG, WEBP o PDF.");
      }

      const maxBytes = 2 * 1024 * 1024;
      if (receiptFile.size > maxBytes) {
        throw new Error("El comprobante supera el límite de 2 MB.");
      }

      const ext = receiptFile.name.split(".").pop()?.toLowerCase() || "bin";
      const cleanName = sanitizeFileName(receiptFile.name);
      const objectPath = `${userId}/${Date.now()}-${cleanName || `voucher.${ext}`}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pagoentrenamiento")
        .upload(objectPath, receiptFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: receiptFile.type,
        });

      if (uploadError) throw uploadError;
      if (!uploadData?.path) {
        throw new Error("El archivo no se pudo subir al bucket.");
      }

      uploadedPath = uploadData.path;

      const operationDatetime = buildOperationDatetime(operationDate, operationTime);

      const insertPayload = {
        training_id: training.id,
        user_id: profile.id,
        socio_name: profile.full_name || "",
        socio_email: profile.email || "",
        socio_dni: profile.dni || "",
        socio_equipo: profile.equipo || null,
        amount: amountNum,
        bank: bank.trim(),
        operation_number: operationNumber.trim(),
        operation_datetime: operationDatetime,
        operation_date: operationDate,
        operation_time: `${operationTime}:00`,
        receipt_path: uploadedPath,
      };

      const { error: insertError } = await supabase
        .from("pagoentrenamiento")
        .insert(insertPayload);

      if (insertError) {
        if (uploadedPath) {
          await supabase.storage.from("pagoentrenamiento").remove([uploadedPath]);
        }
        throw insertError;
      }

      setAlreadyPaid(true);
      setExistingPayment({
        amount: amountNum,
        bank: bank.trim(),
        operation_number: operationNumber.trim(),
        operation_date: operationDate,
        operation_time: `${operationTime}:00`,
        receipt_path: uploadedPath,
        created_at: new Date().toISOString(),
      });

      setReceiptFile(null);
      setAmount("20.00");
      setBank("");
      setOperationNumber("");
      setOperationDate(ymd(new Date()));
      setOperationTime(hhmm(new Date()));

      setMsg("✅ Pago de entrenamiento nocturno registrado correctamente.");
    } catch (e) {
      setMsg(`Error: ${parseSupabaseError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen text="Cargando pago de entrenamiento nocturno..." />;
  }

  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold">Pago de entrenamiento nocturno</h1>
            <p className="text-sm text-white/70 mt-1">
              Registra tu comprobante para el entrenamiento nocturno.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition"
          >
            Volver al Dashboard
          </Link>
        </div>

        {msg ? (
          <Card className="p-4">
            <div className="text-sm font-semibold whitespace-pre-line">{msg}</div>
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="text-lg font-extrabold">Datos del socio</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-white/60">Socio</div>
              <div className="text-sm font-semibold">{profile?.full_name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-white/60">Correo</div>
              <div className="text-sm font-semibold">{profile?.email || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-white/60">DNI</div>
              <div className="text-sm font-semibold">{profile?.dni || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-white/60">Equipo</div>
              <div className="text-sm font-semibold">{profile?.equipo || "—"}</div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-lg font-extrabold">Entrenamiento nocturno</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-white/60">Fecha</div>
              <div className="text-sm font-semibold">
                {formatDatePE(training?.training_date)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Hora</div>
              <div className="text-sm font-semibold">
                {training?.start_time || "19:00:00"}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Etiqueta</div>
              <div className="text-sm font-semibold">
                {training?.label || "Entrenamiento nocturno"}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60">Lugar</div>
              <div className="text-sm font-semibold">
                {training?.location || "Tarapoto"}
              </div>
            </div>
          </div>
        </Card>

        {!training?.id ? (
          <Card className="p-5">
            <div className="text-lg font-extrabold text-red-300">
              No hay entrenamiento nocturno configurado
            </div>
            <div className="mt-2 text-sm text-white/75">
              Revisa la tabla <b>trainings</b> y confirma que exista al menos un registro
              con hora <b>19:00:00</b>.
            </div>
          </Card>
        ) : alreadyPaid ? (
          <Card className="p-5">
            <div className="text-lg font-extrabold text-emerald-300">
              Ya registraste este pago
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-white/60">Monto</div>
                <div className="text-sm font-semibold">
                  S/ {Number(existingPayment?.amount || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/60">Banco</div>
                <div className="text-sm font-semibold">{existingPayment?.bank || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-white/60">N° Operación</div>
                <div className="text-sm font-semibold">
                  {existingPayment?.operation_number || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/60">Fecha operación</div>
                <div className="text-sm font-semibold">
                  {existingPayment?.operation_date
                    ? formatDatePE(existingPayment.operation_date)
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/60">Hora operación</div>
                <div className="text-sm font-semibold">
                  {String(existingPayment?.operation_time || "").slice(0, 5) || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/60">Comprobante</div>
                <div className="text-sm font-semibold break-all">
                  {existingPayment?.receipt_path || "—"}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="text-lg font-extrabold">Registrar pago</div>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-2">Monto</label>
                  <SoftInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="20.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Banco</label>
                  <SoftInput
                    type="text"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Ejemplo: Yape / BCP / Interbank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Número de operación
                  </label>
                  <SoftInput
                    type="text"
                    value={operationNumber}
                    onChange={(e) => setOperationNumber(e.target.value)}
                    placeholder="Ejemplo: 123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Fecha de operación</label>
                  <SoftInput
                    type="date"
                    value={operationDate}
                    onChange={(e) => setOperationDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Hora de operación</label>
                  <SoftInput
                    type="time"
                    value={operationTime}
                    onChange={(e) => setOperationTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Comprobante (JPG, PNG, WEBP o PDF, máx. 2MB)
                  </label>
                  <SoftInput
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <SoftButton type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Registrar pago"}
                </SoftButton>

                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15 transition"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}