/**
 * Reglas de negocio de Termas Punulaf. Funciones puras: sin localStorage ni DOM,
 * para poder probarlas y reutilizarlas desde cualquier pantalla.
 */

export type PackageId = "piscinas" | "tina" | "sauna" | "completo";
export type ResourceKind = "tina" | "sauna";
export type Season = "baja" | "alta";
export type TurnKey = ResourceKind | "piscinas";
export type Attendance = "llego" | "no_vino";


export const TINA_UNITS = 12;
export const SAUNA_UNITS = 5;
export const UNITS: Record<ResourceKind, number> = { tina: TINA_UNITS, sauna: SAUNA_UNITS };
/** Inicio de cada turno (en punto). El recinto opera de 10:00 a 18:00. */
export const TURN_HOURS = [10, 11, 12, 13, 14, 15, 16, 17] as const;
export const TURN_MINUTES: Record<ResourceKind, number> = { tina: 45, sauna: 30 };
export const MAX_PEOPLE = 6;
export const MAX_KIDS = 4;
export const BOOKING_WINDOW_DAYS = 60;
export const CANCEL_NOTICE_HOURS = 24;
export const VENUE_PHONE = "+56 9 4567 8901";

export interface PackageInfo {
  id: PackageId;
  name: string;
  description: string;
  needsTina: boolean;
  needsSauna: boolean;
}

export const PACKAGES: Record<PackageId, PackageInfo> = {
  piscinas: {
    id: "piscinas",
    name: "Piscinas Libres",
    description: "Acceso a las piscinas termales todo el día, sin turnos.",
    needsTina: false,
    needsSauna: false,
  },
  tina: {
    id: "tina",
    name: "Tina y Piscinas",
    description: "Un turno de tina individual de 45 min + piscinas todo el día.",
    needsTina: true,
    needsSauna: false,
  },
  sauna: {
    id: "sauna",
    name: "Sauna y Piscinas",
    description: "Un turno de sauna de 30 min + piscinas todo el día.",
    needsTina: false,
    needsSauna: true,
  },
  completo: {
    id: "completo",
    name: "Día Completo",
    description: "Un turno de tina y uno de sauna en horarios distintos + piscinas.",
    needsTina: true,
    needsSauna: true,
  },
};
export const PACKAGE_ORDER: PackageId[] = ["piscinas", "tina", "sauna", "completo"];

export type Prices = Record<PackageId, Record<Season, number>>;

export const DEFAULT_PRICES: Prices = {
  piscinas: { baja: 12000, alta: 15000 },
  tina: { baja: 16000, alta: 20000 },
  sauna: { baja: 15000, alta: 19000 },
  completo: { baja: 20000, alta: 25000 },
};

export type Maintenance = Record<string, Record<ResourceKind, number[]>>;

export interface Settings {
  season: Season;
  prices: Prices;
  /** Unidades fuera de servicio por fecha (YYYY-MM-DD). */
  maintenance: Maintenance;
}

export function defaultSettings(): Settings {
  return {
    season: "baja",
    prices: structuredClone(DEFAULT_PRICES),
    maintenance: {},
  };
}

export interface Booking {
  id: string;
  code: string;
  packageId: PackageId;
  /** Fecha de la visita, YYYY-MM-DD (hora local). */
  date: string;
  /** Personas de 4 años o más (pagan y ocupan cupo). */
  people: number;
  /** Menores de 4 años: sin cargo, comparten la tina del adulto. */
  kids: number;
  tinaHour: number | null;
  saunaHour: number | null;
  name: string;
  /** Celular chileno: 9 dígitos comenzando en 9, sin +56. */
  phone: string;
  email: string;
  season: Season;
  /** Precio por persona congelado al momento de reservar. */
  unitPrice: number;
  total: number;
  status: "confirmada" | "cancelada";
  createdAt: string;
  cancelledAt: string | null;
  attendance: Partial<Record<TurnKey, Attendance>>;
  sample: boolean;
}

// ---------- Cupos ----------

export function tinasNeeded(people: number): number {
  return Math.max(0, people);
}

/** 1 a 4 personas = 1 sauna; 5 o 6 personas = 2 saunas. */
export function saunasNeeded(people: number): number {
  if (people <= 0) return 0;
  return Math.ceil(people / 4);
}

export function unitsNeeded(kind: ResourceKind, people: number): number {
  return kind === "tina" ? tinasNeeded(people) : saunasNeeded(people);
}

export function bookingHour(b: Pick<Booking, "tinaHour" | "saunaHour">, kind: ResourceKind) {
  return kind === "tina" ? b.tinaHour : b.saunaHour;
}

export function isActive(b: Booking): boolean {
  return b.status === "confirmada";
}

export function bookingsInSlot(
  bookings: Booking[],
  date: string,
  kind: ResourceKind,
  hour: number,
): Booking[] {
  return bookings.filter(
    (b) => isActive(b) && b.date === date && bookingHour(b, kind) === hour,
  );
}

export function unitsUsed(
  bookings: Booking[],
  date: string,
  kind: ResourceKind,
  hour: number,
  excludeId?: string,
): number {
  return bookingsInSlot(bookings, date, kind, hour)
    .filter((b) => b.id !== excludeId)
    .reduce((sum, b) => sum + unitsNeeded(kind, b.people), 0);
}

export function outOfService(maintenance: Maintenance, date: string, kind: ResourceKind): number[] {
  return maintenance[date]?.[kind] ?? [];
}

/** Unidades operativas ese día: total menos las marcadas fuera de servicio. */
export function capacityFor(maintenance: Maintenance, date: string, kind: ResourceKind): number {
  const off = new Set(outOfService(maintenance, date, kind).filter((n) => n >= 1 && n <= UNITS[kind]));
  return UNITS[kind] - off.size;
}

export interface SlotStatus {
  hour: number;
  used: number;
  capacity: number;
  free: number;
  overbooked: boolean;
}

export function slotStatus(
  bookings: Booking[],
  maintenance: Maintenance,
  date: string,
  kind: ResourceKind,
  hour: number,
): SlotStatus {
  const used = unitsUsed(bookings, date, kind, hour);
  const capacity = capacityFor(maintenance, date, kind);
  return { hour, used, capacity, free: Math.max(0, capacity - used), overbooked: used > capacity };
}

/** Regla del Día Completo: tina y sauna deben quedar en horas distintas. */
export function turnConflict(
  packageId: PackageId,
  tinaHour: number | null,
  saunaHour: number | null,
): string | null {
  if (packageId !== "completo") return null;
  if (tinaHour !== null && saunaHour !== null && tinaHour === saunaHour) {
    return `A las ${formatHour(tinaHour)} ya está el turno de tina. Tina y sauna van en horarios distintos.`;
  }
  return null;
}

export interface BookingRequest {
  packageId: PackageId;
  date: string;
  people: number;
  kids: number;
  tinaHour: number | null;
  saunaHour: number | null;
}

/** Valida cupos y turnos de una solicitud contra las reservas existentes. Devuelve un error o null. */
export function validateRequest(
  req: BookingRequest,
  bookings: Booking[],
  maintenance: Maintenance,
): string | null {
  const pkg = PACKAGES[req.packageId];
  if (!pkg) return "Paquete no válido.";
  if (!Number.isInteger(req.people) || req.people < 1 || req.people > MAX_PEOPLE)
    return `El grupo debe ser de 1 a ${MAX_PEOPLE} personas.`;
  if (!Number.isInteger(req.kids) || req.kids < 0 || req.kids > MAX_KIDS)
    return `Se admiten hasta ${MAX_KIDS} menores de 4 años.`;
  if (pkg.needsTina && req.tinaHour === null) return "Falta elegir el horario de tina.";
  if (pkg.needsSauna && req.saunaHour === null) return "Falta elegir el horario de sauna.";
  const conflict = turnConflict(req.packageId, req.tinaHour, req.saunaHour);
  if (conflict) return conflict;
  for (const kind of ["tina", "sauna"] as ResourceKind[]) {
    const needs = kind === "tina" ? pkg.needsTina : pkg.needsSauna;
    if (!needs) continue;
    const hour = kind === "tina" ? req.tinaHour! : req.saunaHour!;
    if (!(TURN_HOURS as readonly number[]).includes(hour)) return "Horario fuera de rango.";
    const s = slotStatus(bookings, maintenance, req.date, kind, hour);
    if (s.free < unitsNeeded(kind, req.people)) {
      return kind === "tina"
        ? `No quedan ${req.people} tinas libres a las ${formatHour(hour)}.`
        : `No quedan saunas suficientes a las ${formatHour(hour)}.`;
    }
  }
  return null;
}

// ---------- Precios ----------

export function priceFor(prices: Prices, season: Season, packageId: PackageId): number {
  return prices[packageId][season];
}

export function totalFor(unitPrice: number, people: number): number {
  return unitPrice * people;
}

// ---------- Celular ----------

/** Acepta "+56 9 1234 5678", "56912345678" o "912345678". Devuelve los 9 dígitos o null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("56")) digits = digits.slice(2);
  if (/^9\d{8}$/.test(digits)) return digits;
  return null;
}

export function formatPhone(phone: string): string {
  if (phone.length !== 9) return phone;
  return `+56 ${phone[0]} ${phone.slice(1, 5)} ${phone.slice(5)}`;
}

// ---------- Fechas ----------

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function formatTurn(kind: ResourceKind, h: number): string {
  const end = `${String(h).padStart(2, "0")}:${String(TURN_MINUTES[kind]).padStart(2, "0")}`;
  return `${formatHour(h)} – ${end}`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Martes, 17 de noviembre de 2026" (solo la primera letra en mayúscula). */
export function formatDateLong(iso: string): string {
  return capitalizeFirst(
    parseISODate(iso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  );
}

/** "Martes, 17 de noviembre" */
export function formatDateShort(iso: string): string {
  return capitalizeFirst(parseISODate(iso).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }));
}

export function formatCLP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");
}

/** Momento de inicio de la visita: el primer turno reservado, o la apertura (10:00) si es solo piscinas. */
export function visitStart(b: Pick<Booking, "date" | "tinaHour" | "saunaHour">): Date {
  const hours = [b.tinaHour, b.saunaHour].filter((h): h is number => h !== null);
  const first = hours.length ? Math.min(...hours) : TURN_HOURS[0];
  const d = parseISODate(b.date);
  d.setHours(first, 0, 0, 0);
  return d;
}

export type CancelCheck =
  | { ok: true }
  | { ok: false; reason: "cancelada" | "pasada" | "menos24"; message: string };

export function canCancel(b: Booking, now: Date): CancelCheck {
  if (b.status === "cancelada")
    return { ok: false, reason: "cancelada", message: "Esta reserva ya está cancelada." };
  const hoursLeft = (visitStart(b).getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0)
    return { ok: false, reason: "pasada", message: "La visita ya comenzó o pasó." };
  if (hoursLeft <= CANCEL_NOTICE_HOURS)
    return {
      ok: false,
      reason: "menos24",
      message: `Faltan menos de ${CANCEL_NOTICE_HOURS} horas, así que los turnos no se liberan en línea. Para cancelar, es necesario contactar al recinto al ${VENUE_PHONE}.`,
    };
  return { ok: true };
}

// ---------- Códigos ----------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(existing: Set<string>, rand: () => number = Math.random): string {
  for (;;) {
    let s = "";
    for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    const code = `PUN-${s}`;
    if (!existing.has(code)) return code;
  }
}

export function normalizeCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.startsWith("PUN") && clean.length > 3) return `PUN-${clean.slice(3)}`;
  return clean;
}

// ---------- Estadísticas ----------

export type Granularity = "dia" | "mes" | "anio";

export interface StatBucket {
  key: string;
  label: string;
  reservas: number;
  canceladas: number;
  facturacion: number;
  personas: number;
  tinas: number;
  saunas: number;
}

export type StatTotals = Omit<StatBucket, "key" | "label">;

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function emptyBucket(key: string, label: string): StatBucket {
  return { key, label, reservas: 0, canceladas: 0, facturacion: 0, personas: 0, tinas: 0, saunas: 0 };
}

/**
 * Agrupa por fecha de visita. Reservas, facturación y unidades consideran solo
 * reservas confirmadas (las canceladas no facturan); las canceladas se cuentan aparte.
 * - dia: cada día del mes indicado
 * - mes: cada mes del año indicado
 * - anio: cada año con datos
 */
export function aggregate(
  bookings: Booking[],
  granularity: Granularity,
  ref: { year: number; month: number },
): { buckets: StatBucket[]; totals: StatTotals } {
  const buckets = new Map<string, StatBucket>();
  if (granularity === "dia") {
    const days = new Date(ref.year, ref.month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const key = `${ref.year}-${String(ref.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      buckets.set(key, emptyBucket(key, String(d)));
    }
  } else if (granularity === "mes") {
    for (let m = 0; m < 12; m++) {
      const key = `${ref.year}-${String(m + 1).padStart(2, "0")}`;
      buckets.set(key, emptyBucket(key, MONTHS_SHORT[m] ?? ""));
    }
  } else {
    const years = new Set(bookings.map((b) => Number(b.date.slice(0, 4))));
    years.add(ref.year);
    [...years].sort((a, b) => a - b).forEach((y) => buckets.set(String(y), emptyBucket(String(y), String(y))));
  }

  for (const b of bookings) {
    const key =
      granularity === "dia" ? b.date : granularity === "mes" ? b.date.slice(0, 7) : b.date.slice(0, 4);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (b.status === "cancelada") {
      bucket.canceladas += 1;
      continue;
    }
    bucket.reservas += 1;
    bucket.facturacion += Number(b.total) || 0;
    bucket.personas += b.people;
    if (b.tinaHour !== null) bucket.tinas += tinasNeeded(b.people);
    if (b.saunaHour !== null) bucket.saunas += saunasNeeded(b.people);
  }

  const list = [...buckets.values()];
  const totals = list.reduce<StatTotals>(
    (t, b) => ({
      reservas: t.reservas + b.reservas,
      canceladas: t.canceladas + b.canceladas,
      facturacion: t.facturacion + b.facturacion,
      personas: t.personas + b.personas,
      tinas: t.tinas + b.tinas,
      saunas: t.saunas + b.saunas,
    }),
    { reservas: 0, canceladas: 0, facturacion: 0, personas: 0, tinas: 0, saunas: 0 },
  );
  return { buckets: list, totals };
}
