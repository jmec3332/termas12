import {
  addDays,
  generateCode,
  PACKAGES,
  priceFor,
  toISODate,
  totalFor,
  TURN_HOURS,
  validateRequest,
  type Booking,
  type Maintenance,
  type PackageId,
  type Prices,
  type Season,
} from "./termas";

/** PRNG con semilla: los datos de ejemplo salen siempre iguales para una misma fecha. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Camila", "Matías", "Valentina", "Benjamín", "Javiera", "Tomás", "Catalina", "Vicente", "Fernanda", "Joaquín", "Constanza", "Felipe", "Antonia", "Diego", "Isidora", "Sebastián", "Francisca", "Cristóbal", "Daniela", "Ignacio"];
const LAST = ["González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela"];

/** Diciembre a febrero y julio (vacaciones de invierno) se consideran temporada alta en los datos de ejemplo. */
export function sampleSeasonFor(date: Date): Season {
  const m = date.getMonth();
  return m === 11 || m === 0 || m === 1 || m === 6 ? "alta" : "baja";
}

export const DEMO_CODE = "PUN-2026";
export const DEMO_PHONE = "912345678";
export const DEMO_TODAY_CODE = "PUN-HOY1";
export const DEMO_TODAY_PHONE = "987654321";

export function buildSampleData(now: Date, prices: Prices): { bookings: Booking[]; maintenance: Maintenance } {
  const rand = mulberry32(Number(toISODate(now).replace(/-/g, "")));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const bookings: Booking[] = [];
  const codes = new Set<string>([DEMO_CODE, DEMO_TODAY_CODE]);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = toISODate(today);
  let seq = 0;

  const maintenance: Maintenance = { [todayIso]: { tina: [11, 12], sauna: [5] } };

  const make = (
    date: Date,
    packageId: PackageId,
    people: number,
    kids: number,
    tinaHour: number | null,
    saunaHour: number | null,
    extra: Partial<Booking> = {},
  ): Booking => {
    const season = sampleSeasonFor(date);
    const unitPrice = priceFor(prices, season, packageId);
    const created = addDays(date, -Math.floor(1 + rand() * 12));
    created.setHours(9 + Math.floor(rand() * 12), Math.floor(rand() * 60));
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    return {
      id: `sample-${++seq}`,
      code: generateCode(codes, rand),
      packageId,
      date: toISODate(date),
      people,
      kids,
      tinaHour,
      saunaHour,
      name,
      phone: "9" + String(Math.floor(10000000 + rand() * 89999999)),
      email: "",
      season,
      unitPrice,
      total: totalFor(unitPrice, people),
      status: "confirmada",
      createdAt: (created > now ? now : created).toISOString(),
      cancelledAt: null,
      attendance: {},
      sample: true,
      ...extra,
    };
  };

  // Sobreocupación de ejemplo: hoy 12:00 con 12 tinas reservadas y 2 en mantención.
  for (let i = 0; i < 3; i++) bookings.push(make(today, "tina", 4, i === 0 ? 1 : 0, 12, null));

  // Reservas conocidas para probar "Mi visita".
  const demoDay = addDays(today, 3);
  const demo = make(demoDay, "completo", 2, 1, 11, 15, {
    id: "sample-demo",
    code: DEMO_CODE,
    phone: DEMO_PHONE,
    name: "Camila Rojas",
    email: "camila@example.cl",
  });
  bookings.push(demo);
  const todayDemo = make(today, "sauna", 3, 0, null, 16, {
    id: "sample-hoy",
    code: DEMO_TODAY_CODE,
    phone: DEMO_TODAY_PHONE,
    name: "Tomás Fuentes",
  });
  bookings.push(todayDemo);

  const packages: PackageId[] = ["piscinas", "tina", "tina", "sauna", "completo", "completo"];
  for (let offset = -420; offset <= 21; offset++) {
    const date = addDays(today, offset);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    let count: number;
    if (offset < -75) count = rand() < 0.35 ? 1 + Math.floor(rand() * (weekend ? 4 : 2)) : 0;
    else if (offset < 0) count = 2 + Math.floor(rand() * (weekend ? 6 : 4));
    else count = Math.floor(rand() * (weekend ? 6 : 4)) + (offset < 7 ? 1 : 0);

    for (let i = 0; i < count; i++) {
      const packageId = pick(packages);
      const pkg = PACKAGES[packageId];
      const people = rand() < 0.15 ? 5 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 4);
      const kids = rand() < 0.2 ? 1 : 0;
      const tinaHour = pkg.needsTina ? pick(TURN_HOURS) : null;
      let saunaHour: number | null = pkg.needsSauna ? pick(TURN_HOURS) : null;
      if (packageId === "completo" && saunaHour === tinaHour) {
        saunaHour = tinaHour === 17 ? 10 : (tinaHour as number) + 1;
      }
      const req = { packageId, date: toISODate(date), people, kids, tinaHour, saunaHour };
      if (validateRequest(req, bookings, offset === 0 ? maintenance : {})) continue;
      const b = make(date, packageId, people, kids, tinaHour, saunaHour);
      if (rand() < 0.1) {
        b.status = "cancelada";
        const c = addDays(date, -2);
        b.cancelledAt = (c > now ? now : c).toISOString();
      } else if (offset < 0) {
        const mark = rand() < 0.88 ? "llego" : "no_vino";
        if (b.tinaHour !== null) b.attendance.tina = mark;
        if (b.saunaHour !== null) b.attendance.sauna = mark;
        if (b.tinaHour === null && b.saunaHour === null) b.attendance.piscinas = mark;
      }
      bookings.push(b);
    }
  }

  return { bookings, maintenance };
}
