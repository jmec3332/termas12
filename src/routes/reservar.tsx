import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Flame, Waves } from "lucide-react";

import { BookingCard } from "@/components/booking-card";
import { NumberStepper } from "@/components/number-stepper";
import { Loading, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBooking, useTermas } from "@/lib/store";
import {
  addDays,
  BOOKING_WINDOW_DAYS,
  formatCLP,
  formatDateShort,
  formatHour,
  formatTurn,
  MAX_KIDS,
  MAX_PEOPLE,
  normalizePhone,
  PACKAGE_ORDER,
  PACKAGES,
  parseISODate,
  priceFor,
  saunasNeeded,
  slotStatus,
  toISODate,
  TURN_HOURS,
  unitsNeeded,
  type Booking,
  type PackageId,
  type ResourceKind,
} from "@/lib/termas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar · Termas Punulaf" },
      { name: "description", content: "Reserva tina, sauna o Día Completo en Termas Punulaf en cuatro pasos." },
      { property: "og:title", content: "Reservar · Termas Punulaf" },
      { property: "og:description", content: "Reserva tina, sauna o Día Completo en Termas Punulaf en cuatro pasos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservarPage,
});

const STEPS = ["Paquete", "Día y grupo", "Tu horario", "Tus datos"];
type FormErrors = Partial<Record<"name" | "phone" | "email" | "form", string>>;

function ReservarPage() {
  const { ready, bookings, settings } = useTermas();
  const [step, setStep] = useState(0);
  const [packageId, setPackageId] = useState<PackageId | null>(null);
  const [date, setDate] = useState<string>("");
  const [people, setPeople] = useState(2);
  const [kids, setKids] = useState(0);
  const [tinaHour, setTinaHour] = useState<number | null>(null);
  const [saunaHour, setSaunaHour] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const today = useMemo(() => (ready ? toISODate(new Date()) : ""), [ready]);
  const activeDate = date || today;
  const pkg = packageId ? PACKAGES[packageId] : null;
  const unitPrice = packageId ? priceFor(settings.prices, settings.season, packageId) : 0;

  if (!ready) return <Loading />;

  const goTo = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const resetHours = () => {
    setTinaHour(null);
    setSaunaHour(null);
  };

  if (confirmed) {
    return (
      <>
        <PageHeader eyebrow="Reserva confirmada" title="¡Listo, nos vemos en las termas!">
          Guarda el código: con él y el celular se puede revisar o cancelar la visita en «Mi visita».
        </PageHeader>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <BookingCard booking={confirmed} />
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmed(null);
                setPackageId(null);
                setDate("");
                setPeople(2);
                setKids(0);
                resetHours();
                setName("");
                setPhone("");
                setEmail("");
                setErrors({});
                goTo(0);
              }}
            >
              Hacer otra reserva
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const canNext = (() => {
    if (step === 0) return !!packageId;
    if (step === 1) return !!activeDate && people >= 1;
    if (step === 2) {
      if (!pkg) return false;
      return (!pkg.needsTina || tinaHour !== null) && (!pkg.needsSauna || saunaHour !== null);
    }
    return true;
  })();

  const submit = () => {
    const e: FormErrors = {};
    if (name.trim().length < 3) e.name = "Escribe nombre y apellido.";
    const normalized = normalizePhone(phone);
    if (!normalized) e.phone = "Debe ser un celular chileno de 9 dígitos que comience en 9 (ej: 9 1234 5678).";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "El correo no parece válido.";
    setErrors(e);
    if (Object.keys(e).length || !packageId || !normalized) return;
    const res = createBooking({
      packageId,
      date: activeDate,
      people,
      kids,
      tinaHour: pkg?.needsTina ? tinaHour : null,
      saunaHour: pkg?.needsSauna ? saunaHour : null,
      name,
      phone: normalized,
      email,
    });
    if (!res.ok) {
      setErrors({ form: res.error + " Elige otro horario." });
      resetHours();
      goTo(2);
      return;
    }
    setConfirmed(res.booking);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageHeader eyebrow={`Paso ${step + 1} de 4`} title={STEPS[step] ?? ""} />
      <div className="mx-auto max-w-3xl px-4 pb-40 pt-5">
        <ol className="mb-6 grid grid-cols-4 gap-1.5" aria-label="Pasos">
          {STEPS.map((label, i) => (
            <li key={label} className="text-center">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-border")} />
              <span className={cn("mt-1 block text-[11px] font-bold", i === step ? "text-foreground" : "text-muted-foreground")}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        {errors.form && (
          <p className="mb-4 rounded-xl bg-destructive-soft p-3 text-sm font-bold text-destructive">{errors.form}</p>
        )}

        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {PACKAGE_ORDER.map((id) => {
              const p = PACKAGES[id];
              const selected = packageId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPackageId(id);
                    resetHours();
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "relative rounded-2xl border-2 bg-card p-4 text-left shadow-card transition-all hover:border-moss",
                    selected ? "border-accent ring-2 ring-accent/30" : "border-transparent",
                  )}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Check className="size-4" />
                    </span>
                  )}
                  <div className="flex gap-1.5">
                    {p.needsTina && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-tina-soft px-2 py-0.5 text-xs font-bold text-tina">
                        <Waves className="size-3" /> Tina
                      </span>
                    )}
                    {p.needsSauna && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sauna-soft px-2 py-0.5 text-xs font-bold text-sauna-foreground">
                        <Flame className="size-3" /> Sauna
                      </span>
                    )}
                    <span className="rounded-full bg-moss-soft px-2 py-0.5 text-xs font-bold text-primary">Piscinas</span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold">{p.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  <p className="mt-3 font-display text-xl font-black">
                    {formatCLP(priceFor(settings.prices, settings.season, id))}
                    <span className="ml-1 font-sans text-xs font-bold text-muted-foreground">por persona · temporada {settings.season}</span>
                  </p>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground sm:col-span-2">Menores de 4 años entran sin cargo.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-4 shadow-card">
              <h2 className="text-base font-bold">¿Qué día?</h2>
              <DayPicker
                today={today}
                value={activeDate}
                onChange={(d) => {
                  setDate(d);
                  resetHours();
                }}
              />
            </section>
            <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2">
              <div>
                <Label htmlFor="people" className="text-base font-bold">Personas</Label>
                <p className="mb-2 text-xs text-muted-foreground">De 4 años o más, máximo {MAX_PEOPLE}.</p>
                <NumberStepper id="people" value={people} min={1} max={MAX_PEOPLE} onChange={(n) => { setPeople(n); resetHours(); }} />
              </div>
              <div>
                <Label htmlFor="kids" className="text-base font-bold">Menores de 4 años</Label>
                <p className="mb-2 text-xs text-muted-foreground">Sin cargo, comparten la tina del adulto.</p>
                <NumberStepper id="kids" value={kids} min={0} max={MAX_KIDS} onChange={setKids} />
              </div>
              {pkg && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  {pkg.needsTina && <>Se necesitan <strong className="text-tina">{people} tinas</strong> libres en el mismo horario. </>}
                  {pkg.needsSauna && <>El grupo usa <strong className="text-sauna-foreground">{saunasNeeded(people)} sauna{saunasNeeded(people) > 1 ? "s" : ""}</strong>.</>}
                  {!pkg.needsTina && !pkg.needsSauna && <>Piscinas libres, sin turnos ni cupo.</>}
                </p>
              )}
            </section>
          </div>
        )}

        {step === 2 && pkg && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {formatDateShort(activeDate)}
              {" · "}{people} {people === 1 ? "persona" : "personas"}
            </p>
            {!pkg.needsTina && !pkg.needsSauna && (
              <div className="rounded-2xl border bg-moss-soft p-5">
                <h2 className="text-lg font-bold text-primary">Sin horario que elegir</h2>
                <p className="mt-1 text-sm">Las piscinas son libres todo el día, de 10:00 a 18:00. Basta con llegar.</p>
              </div>
            )}
            {pkg.needsTina && (
              <SlotPicker
                kind="tina"
                date={activeDate}
                today={today}
                people={people}
                selected={tinaHour}
                blockedHour={packageId === "completo" ? saunaHour : null}
                onSelect={(h) => { setTinaHour(h); setErrors({}); }}
                bookings={bookings}
                maintenance={settings.maintenance}
              />
            )}
            {pkg.needsSauna && (
              <SlotPicker
                kind="sauna"
                date={activeDate}
                today={today}
                people={people}
                selected={saunaHour}
                blockedHour={packageId === "completo" ? tinaHour : null}
                onSelect={(h) => { setSaunaHour(h); setErrors({}); }}
                bookings={bookings}
                maintenance={settings.maintenance}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <form
            id="datos"
            className="space-y-4 rounded-2xl border bg-card p-4 shadow-card"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre y apellido</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-sm font-bold text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Celular</Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-bold">+56</span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="9 1234 5678"
                  className="rounded-l-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors.phone}
                />
              </div>
              {errors.phone ? (
                <p className="text-sm font-bold text-destructive">{errors.phone}</p>
              ) : (
                <p className="text-xs text-muted-foreground">9 dígitos, comenzando en 9. Junto al código sirve para buscar la reserva.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo (opcional)</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-sm font-bold text-destructive">{errors.email}</p>}
            </div>
            {pkg && (
              <div className="rounded-xl bg-secondary p-3 text-sm">
                <p className="font-bold">{pkg.name}</p>
                <p className="text-muted-foreground">{formatDateShort(activeDate)}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
                  {pkg.needsTina && tinaHour !== null && <span className="font-bold text-tina">Tina {formatTurn("tina", tinaHour)}</span>}
                  {pkg.needsSauna && saunaHour !== null && <span className="font-bold text-sauna-foreground">Sauna {formatTurn("sauna", saunaHour)}</span>}
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Barra fija: resumen + botón principal siempre visible */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 0 && (
            <Button variant="outline" size="icon" aria-label="Volver" onClick={() => goTo(step - 1)}>
              <ArrowLeft />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {pkg ? (
              <>
                <p className="truncate text-xs text-muted-foreground">
                  {pkg.name} · {people} × {formatCLP(unitPrice)}
                </p>
                <p className="font-display text-lg font-black leading-tight">{formatCLP(unitPrice * people)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Elige un paquete</p>
            )}
          </div>
          {step < 3 ? (
            <Button variant="hero" size="lg" disabled={!canNext} onClick={() => goTo(step + 1)}>
              Continuar <ArrowRight />
            </Button>
          ) : (
            <Button variant="hero" size="lg" type="submit" form="datos">
              Confirmar <Check />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function DayPicker({ today, value, onChange }: { today: string; value: string; onChange: (d: string) => void }) {
  const base = parseISODate(today);
  const days = Array.from({ length: 14 }, (_, i) => addDays(base, i));
  const max = toISODate(addDays(base, BOOKING_WINDOW_DAYS));
  return (
    <div className="mt-3 space-y-3">
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {days.map((d) => {
            const iso = toISODate(d);
            const selected = iso === value;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onChange(iso)}
                aria-pressed={selected}
                className={cn(
                  "flex w-14 flex-col items-center rounded-xl border py-2 transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-moss",
                )}
              >
                <span className="text-[11px] font-bold uppercase">{iso === today ? "Hoy" : d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "")}</span>
                <span className="font-display text-lg font-black">{d.getDate()}</span>
                <span className="text-[10px] uppercase">{d.toLocaleDateString("es-CL", { month: "short" }).replace(".", "")}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="date" className="shrink-0 text-sm text-muted-foreground">Otra fecha:</Label>
        <Input id="date" type="date" min={today} max={max} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="max-w-48" />
      </div>
    </div>
  );
}

function SlotPicker({
  kind,
  date,
  today,
  people,
  selected,
  blockedHour,
  onSelect,
  bookings,
  maintenance,
}: {
  kind: ResourceKind;
  date: string;
  today: string;
  people: number;
  selected: number | null;
  blockedHour: number | null;
  onSelect: (h: number) => void;
  bookings: Booking[];
  maintenance: Parameters<typeof slotStatus>[1];
}) {
  const need = unitsNeeded(kind, people);
  const now = new Date();
  const isTina = kind === "tina";
  return (
    <section className={cn("rounded-2xl border-2 bg-card p-4 shadow-card", isTina ? "border-tina/30" : "border-sauna/40")}>
      <div className="flex items-center gap-2">
        <span className={cn("grid size-8 place-items-center rounded-full", isTina ? "bg-tina text-tina-foreground" : "bg-sauna text-sauna-foreground")}>
          {isTina ? <Waves className="size-4" /> : <Flame className="size-4" />}
        </span>
        <div>
          <h2 className="text-base font-bold">{isTina ? "Horario de tina · 45 min" : "Horario de sauna · 30 min"}</h2>
          <p className="text-xs text-muted-foreground">
            {isTina ? `Se necesitan ${need} tina${need > 1 ? "s" : ""} libre${need > 1 ? "s" : ""}.` : `El grupo usa ${need} sauna${need > 1 ? "s" : ""}.`}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
        {TURN_HOURS.map((h) => {
          const s = slotStatus(bookings, maintenance, date, kind, h);
          const past = date === today && now.getHours() >= h;
          const blocked = blockedHour === h;
          const full = s.free < need;
          const disabled = past || blocked || full;
          const isSel = selected === h;
          const note = past ? "Ya pasó" : blocked ? (isTina ? "Sauna a esta hora" : "Tina a esta hora") : full ? "Sin cupo" : `${s.free} libre${s.free === 1 ? "" : "s"}`;
          return (
            <button
              key={h}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(h)}
              aria-pressed={isSel}
              className={cn(
                "rounded-xl border-2 px-2 py-2 text-center transition-colors disabled:cursor-not-allowed",
                isSel
                  ? isTina
                    ? "border-tina bg-tina text-tina-foreground"
                    : "border-sauna bg-sauna text-sauna-foreground"
                  : disabled
                    ? blocked
                      ? "border-dashed border-destructive/40 bg-destructive-soft/60 text-destructive"
                      : "border-transparent bg-muted text-muted-foreground opacity-60"
                    : isTina
                      ? "border-tina/20 bg-tina-soft text-tina hover:border-tina"
                      : "border-sauna/30 bg-sauna-soft text-sauna-foreground hover:border-sauna",
              )}
            >
              <span className="block font-display text-base font-black">{formatHour(h)}</span>
              <span className="block text-[11px] font-bold">{note}</span>
            </button>
          );
        })}
      </div>
      {blockedHour !== null && (
        <p className="mt-3 rounded-lg bg-destructive-soft px-3 py-2 text-xs font-bold text-destructive">
          Las {formatHour(blockedHour)} quedan bloqueadas porque ya está el turno de {isTina ? "sauna" : "tina"} a esa hora: en Día Completo, tina y sauna van en horarios distintos.
        </p>
      )}
    </section>
  );
}
