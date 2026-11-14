import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Flame, KeyRound, Save, Search, Trash2, RotateCcw, Waves, Wrench } from "lucide-react";
import { toast } from "sonner";

import { AdminGate } from "@/components/admin-gate";
import { CancelAction } from "@/components/cancel-action";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteSampleData,
  restoreSampleData,
  setAdminPassword,
  setAttendance,
  setPackagePrices,
  setSeason,
  toggleOutOfService,
  useTermas,
} from "@/lib/store";
import {
  addDays,
  bookingsInSlot,
  capacityFor,
  formatCLP,
  formatDateLong,
  formatHour,
  formatPhone,
  normalizePhone,
  outOfService,
  PACKAGE_ORDER,
  PACKAGES,
  parseISODate,
  slotStatus,
  toISODate,
  TURN_HOURS,
  unitsNeeded,
  UNITS,
  type Booking,
  type PackageId,
  type ResourceKind,
  type Season,
  type TurnKey,
} from "@/lib/termas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración · Termas Punulaf" },
      { name: "description", content: "Gestión de temporada, precios, mantenimiento, asistencia y cancelaciones de Termas Punulaf." },
      { property: "og:title", content: "Administración · Termas Punulaf" },
      { property: "og:description", content: "Gestión de temporada, precios, mantenimiento y asistencia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate title="Administración">
      <AdminPanel />
    </AdminGate>
  ),
});

function AdminPanel() {
  const { settings } = useTermas();
  return (
    <>
      <PageHeader eyebrow="Panel del recinto" title="Administración">
        Temporada actual: <strong className="text-foreground">{settings.season === "alta" ? "Alta" : "Baja"}</strong>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-4 flex justify-end">
          <LogoutButton />
        </div>
        <Tabs defaultValue="grilla">
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList className="h-auto w-max">
              <TabsTrigger value="grilla" className="py-1.5">Grilla del día</TabsTrigger>
              <TabsTrigger value="buscar" className="py-1.5">Buscar por celular</TabsTrigger>
              <TabsTrigger value="precios" className="py-1.5">Temporada y precios</TabsTrigger>
              <TabsTrigger value="ajustes" className="py-1.5">Clave y datos</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="grilla" className="mt-5"><DayGrid /></TabsContent>
          <TabsContent value="buscar" className="mt-5"><PhoneSearch /></TabsContent>
          <TabsContent value="precios" className="mt-5"><PricesPanel /></TabsContent>
          <TabsContent value="ajustes" className="mt-5"><SettingsPanel /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ---------- Grilla ----------

function DayGrid() {
  const { bookings, settings } = useTermas();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const m = settings.maintenance;

  const overbooked = useMemo(() => {
    const list: { kind: ResourceKind; hour: number; missing: number; bookings: Booking[] }[] = [];
    for (const kind of ["tina", "sauna"] as ResourceKind[]) {
      for (const h of TURN_HOURS) {
        const s = slotStatus(bookings, m, date, kind, h);
        if (s.overbooked) list.push({ kind, hour: h, missing: s.used - s.capacity, bookings: bookingsInSlot(bookings, date, kind, h) });
      }
    }
    return list;
  }, [bookings, m, date]);

  const poolOnly = bookings.filter((b) => b.status === "confirmada" && b.date === date && b.tinaHour === null && b.saunaHour === null);
  const shift = (n: number) => setDate(toISODate(addDays(parseISODate(date), n)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => shift(-1)}><ChevronLeft /></Button>
        <Input type="date" aria-label="Fecha" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" />
        <Button variant="outline" size="icon" aria-label="Día siguiente" onClick={() => shift(1)}><ChevronRight /></Button>
        <Button variant="ghost" onClick={() => setDate(toISODate(new Date()))}>Hoy</Button>
        <p className="w-full text-sm font-bold capitalize text-muted-foreground sm:w-auto">{formatDateLong(date)}</p>
      </div>

      <MaintenancePanel date={date} />

      {overbooked.length > 0 && (
        <section className="rounded-2xl border-2 border-destructive bg-destructive-soft p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-destructive">
            <AlertTriangle className="size-5" /> Sobreocupación por mantenimiento
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {overbooked.map((o) => (
              <li key={`${o.kind}-${o.hour}`}>
                <strong>{o.kind === "tina" ? "Tinas" : "Saunas"} {formatHour(o.hour)}</strong>: faltan {o.missing} unidad{o.missing > 1 ? "es" : ""}. Reservas afectadas:{" "}
                {o.bookings.map((b) => `${b.code} (${b.name}, ${formatPhone(b.phone)})`).join(" · ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-tina" /> Tinas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-sauna" /> Saunas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-destructive" /> Sobreocupado</span>
      </div>

      <div className="space-y-3">
        {TURN_HOURS.map((h) => (
          <HourRow key={h} date={date} hour={h} bookings={bookings} />
        ))}
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h3 className="font-bold">Solo piscinas ({poolOnly.length})</h3>
        {poolOnly.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Sin reservas de solo piscinas este día.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {poolOnly.map((b) => (
              <BookingRow key={b.id} booking={b} turn="piscinas" />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MaintenancePanel({ date }: { date: string }) {
  const { settings } = useTermas();
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-bold"><Wrench className="size-4" /> Fuera de servicio este día</h2>
      <p className="text-xs text-muted-foreground">Toca una unidad para marcarla en mantención. Reduce el cupo de todos los turnos del día.</p>
      {(["tina", "sauna"] as ResourceKind[]).map((kind) => {
        const off = outOfService(settings.maintenance, date, kind);
        const cap = capacityFor(settings.maintenance, date, kind);
        return (
          <div key={kind} className="mt-3">
            <p className="mb-1.5 text-sm font-bold">
              {kind === "tina" ? "Tinas" : "Saunas"}: <span className={kind === "tina" ? "text-tina" : "text-sauna-foreground"}>{cap} de {UNITS[kind]} operativas</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: UNITS[kind] }, (_, i) => i + 1).map((n) => {
                const isOff = off.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleOutOfService(date, kind, n)}
                    aria-pressed={isOff}
                    aria-label={`${kind === "tina" ? "Tina" : "Sauna"} ${n} ${isOff ? "fuera de servicio" : "operativa"}`}
                    className={cn(
                      "h-9 min-w-9 rounded-lg border-2 px-2 text-sm font-black transition-colors",
                      isOff
                        ? "border-destructive bg-destructive text-destructive-foreground line-through"
                        : kind === "tina"
                          ? "border-tina/30 bg-tina-soft text-tina hover:border-tina"
                          : "border-sauna/40 bg-sauna-soft text-sauna-foreground hover:border-sauna",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Meter({ kind, used, capacity }: { kind: ResourceKind; used: number; capacity: number }) {
  const over = used > capacity;
  const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : used > 0 ? 100 : 0;
  return (
    <div className={cn("rounded-lg p-2", over ? "bg-destructive text-destructive-foreground" : kind === "tina" ? "bg-tina-soft" : "bg-sauna-soft")}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={cn("inline-flex items-center gap-1", !over && (kind === "tina" ? "text-tina" : "text-sauna-foreground"))}>
          {kind === "tina" ? <Waves className="size-3.5" /> : <Flame className="size-3.5" />}
          {kind === "tina" ? "Tinas" : "Saunas"}
        </span>
        <span className="tabular">{used}/{capacity}</span>
      </div>
      <div className={cn("mt-1 h-1.5 overflow-hidden rounded-full", over ? "bg-destructive-foreground/30" : "bg-card")}>
        <div className={cn("h-full rounded-full", over ? "bg-destructive-foreground" : kind === "tina" ? "bg-tina" : "bg-sauna")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HourRow({ date, hour, bookings }: { date: string; hour: number; bookings: Booking[] }) {
  const { settings } = useTermas();
  const tina = slotStatus(bookings, settings.maintenance, date, "tina", hour);
  const sauna = slotStatus(bookings, settings.maintenance, date, "sauna", hour);
  const tinaList = bookingsInSlot(bookings, date, "tina", hour);
  const saunaList = bookingsInSlot(bookings, date, "sauna", hour);
  const over = tina.overbooked || sauna.overbooked;
  return (
    <section className={cn("rounded-2xl border-2 bg-card p-3 shadow-card", over ? "border-destructive" : "border-transparent")}>
      <div className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2">
        <p className={cn("font-display text-lg font-black", over && "text-destructive")}>{formatHour(hour)}</p>
        <Meter kind="tina" used={tina.used} capacity={tina.capacity} />
        <Meter kind="sauna" used={sauna.used} capacity={sauna.capacity} />
      </div>
      {(tinaList.length > 0 || saunaList.length > 0) && (
        <ul className="mt-2 divide-y">
          {tinaList.map((b) => <BookingRow key={`t-${b.id}`} booking={b} turn="tina" affected={tina.overbooked} />)}
          {saunaList.map((b) => <BookingRow key={`s-${b.id}`} booking={b} turn="sauna" affected={sauna.overbooked} />)}
        </ul>
      )}
    </section>
  );
}

function BookingRow({ booking: b, turn, affected }: { booking: Booking; turn: TurnKey; affected?: boolean }) {
  const current = b.attendance[turn];
  const units = turn === "piscinas" ? b.people : unitsNeeded(turn, b.people);
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 py-2", affected && "rounded-md bg-destructive-soft px-2")}>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
          {turn !== "piscinas" && <Badge variant={turn}>{turn === "tina" ? `Tina ×${units}` : `Sauna ×${units}`}</Badge>}
          <span>{b.code}</span>
          <span className="font-normal text-muted-foreground">· {b.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {PACKAGES[b.packageId].name} · {b.people} pers.{b.kids ? ` + ${b.kids} menor` : ""} · {formatPhone(b.phone)}
          {affected && <strong className="ml-1 text-destructive">· Afectada por mantención</strong>}
        </p>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={`Asistencia ${b.code}`}>
        <Button
          size="sm"
          variant={current === "llego" ? "moss" : "outline"}
          aria-pressed={current === "llego"}
          onClick={() => setAttendance(b.id, turn, current === "llego" ? null : "llego")}
        >
          Llegó
        </Button>
        <Button
          size="sm"
          variant={current === "no_vino" ? "destructive" : "outline"}
          aria-pressed={current === "no_vino"}
          onClick={() => setAttendance(b.id, turn, current === "no_vino" ? null : "no_vino")}
        >
          No vino
        </Button>
      </div>
    </li>
  );
}

// ---------- Búsqueda por celular ----------

function PhoneSearch() {
  const { bookings } = useTermas();
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [error, setError] = useState("");
  const results = query ? bookings.filter((b) => b.phone === query).sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <div className="space-y-4">
      <form
        className="flex max-w-md flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const p = normalizePhone(phone);
          if (!p) {
            setError("El celular debe tener 9 dígitos y comenzar en 9.");
            setQuery(null);
            return;
          }
          setError("");
          setQuery(p);
        }}
      >
        <div className="flex flex-1">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-bold">+56</span>
          <Input type="tel" inputMode="numeric" aria-label="Celular" placeholder="9 1234 5678" className="rounded-l-none" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button type="submit"><Search /> Buscar</Button>
      </form>
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      {query && (
        <p className="text-sm text-muted-foreground">
          {results.length} reserva{results.length === 1 ? "" : "s"} para {formatPhone(query)}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((b) => (
          <article key={b.id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-black">{b.code}</p>
                <p className="text-sm capitalize text-muted-foreground">{formatDateLong(b.date)}</p>
              </div>
              <Badge variant={b.status === "cancelada" ? "alert" : "moss"}>{b.status === "cancelada" ? "Cancelada" : "Confirmada"}</Badge>
            </div>
            <p className="mt-2 text-sm">
              <strong>{PACKAGES[b.packageId].name}</strong> · {b.people} pers. · {formatCLP(b.total)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {b.tinaHour !== null && <Badge variant="tina">Tina {formatHour(b.tinaHour)}</Badge>}
              {b.saunaHour !== null && <Badge variant="sauna">Sauna {formatHour(b.saunaHour)}</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.name}</p>
            <div className="mt-3"><CancelAction booking={b} size="sm" /></div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------- Precios ----------

function PricesPanel() {
  const { settings } = useTermas();
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="text-base font-bold">Temporada para nuevas reservas</h2>
        <p className="text-xs text-muted-foreground">Las reservas ya hechas conservan el precio con que se tomaron.</p>
        <div className="mt-3 inline-flex rounded-full bg-secondary p-1">
          {(["baja", "alta"] as Season[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={settings.season === s}
              onClick={() => {
                setSeason(s);
                toast.success(`Temporada ${s} activada.`);
              }}
              className={cn(
                "rounded-full px-5 py-1.5 text-sm font-bold capitalize transition-colors",
                settings.season === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "baja" ? "Baja" : "Alta"}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="text-base font-bold">Precios por persona</h2>
        <div className="mt-3 divide-y">
          {PACKAGE_ORDER.map((id) => (
            <PriceRow key={`${id}-${settings.prices[id].baja}-${settings.prices[id].alta}`} id={id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PriceRow({ id }: { id: PackageId }) {
  const { settings } = useTermas();
  const [baja, setBaja] = useState(String(settings.prices[id].baja));
  const [alta, setAlta] = useState(String(settings.prices[id].alta));
  const dirty = Number(baja) !== settings.prices[id].baja || Number(alta) !== settings.prices[id].alta;
  return (
    <form
      className="grid grid-cols-2 items-end gap-2 py-3 sm:grid-cols-[1fr_9rem_9rem_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const b = Math.round(Number(baja));
        const a = Math.round(Number(alta));
        if (!(b > 0) || !(a > 0)) {
          toast.error("Los precios deben ser mayores que cero.");
          return;
        }
        setPackagePrices(id, { baja: b, alta: a });
        toast.success(`Precios de ${PACKAGES[id].name} grabados.`);
      }}
    >
      <p className="col-span-2 font-bold sm:col-span-1 sm:self-center">{PACKAGES[id].name}</p>
      <div className="space-y-1">
        <Label htmlFor={`${id}-baja`} className="text-xs text-muted-foreground">Baja ($)</Label>
        <Input id={`${id}-baja`} type="number" min={1} step={500} inputMode="numeric" value={baja} onChange={(e) => setBaja(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-alta`} className="text-xs text-muted-foreground">Alta ($)</Label>
        <Input id={`${id}-alta`} type="number" min={1} step={500} inputMode="numeric" value={alta} onChange={(e) => setAlta(e.target.value)} />
      </div>
      <Button type="submit" className="col-span-2 sm:col-span-1" variant={dirty ? "hero" : "default"}>
        <Save /> Grabar
      </Button>
    </form>
  );
}

// ---------- Clave y datos ----------

function SettingsPanel() {
  const { bookings } = useTermas();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState("");
  const sampleCount = bookings.filter((b) => b.sample).length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-bold"><KeyRound className="size-4" /> Clave de administración</h2>
        <p className="text-xs text-muted-foreground">Sirve para entrar a Administración y a Gráficos.</p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd.trim().length < 6) return setError("La clave debe tener al menos 6 caracteres.");
            if (pwd !== pwd2) return setError("Las claves no coinciden.");
            setAdminPassword(pwd);
            setError("");
            setPwd("");
            setPwd2("");
            toast.success("Clave actualizada.");
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="new-pwd">Nueva clave</Label>
            <Input id="new-pwd" type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-pwd2">Repetir clave</Label>
              <Input id="new-pwd2" type="password" autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </div>
            <Button type="submit"><Save /> Grabar</Button>
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </form>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="text-base font-bold">Datos de ejemplo</h2>
        <p className="text-xs text-muted-foreground">
          Hay {sampleCount} reservas de ejemplo. Las reservas reales no se tocan.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={sampleCount === 0}><Trash2 /> Eliminar datos de ejemplo</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar las {sampleCount} reservas de ejemplo?</AlertDialogTitle>
                <AlertDialogDescription>Se borran solo las reservas de prueba. Precios, clave y reservas reales se mantienen.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteSampleData();
                    toast.success("Datos de ejemplo eliminados.");
                  }}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            onClick={() => {
              restoreSampleData();
              toast.success("Datos de ejemplo cargados de nuevo.");
            }}
          >
            <RotateCcw /> Recargar datos de ejemplo
          </Button>
        </div>
      </section>
    </div>
  );
}
