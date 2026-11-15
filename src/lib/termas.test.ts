import { describe, expect, it } from "vitest";

import { buildSampleData } from "./seed";
import { buildPdf, buildIcs } from "./exports";
import { hashPassword, verifyPassword } from "./password";
import {
  aggregate,
  canCancel,
  capacityFor,
  DEFAULT_ADMIN_PASSWORD_HASH,
  DEFAULT_PRICES,
  normalizePhone,
  priceFor,
  saunasNeeded,
  slotStatus,
  tinasNeeded,
  turnConflict,
  validateRequest,
  type Booking,
} from "./termas";

function booking(p: Partial<Booking>): Booking {
  return {
    id: Math.random().toString(36),
    code: "PUN-TEST",
    packageId: "tina",
    date: "2026-12-01",
    people: 1,
    kids: 0,
    tinaHour: 11,
    saunaHour: null,
    name: "Test",
    phone: "912345678",
    email: "",
    season: "baja",
    unitPrice: 16000,
    total: 16000,
    status: "confirmada",
    createdAt: "2026-11-01T10:00:00.000Z",
    cancelledAt: null,
    attendance: {},
    sample: false,
    ...p,
  };
}

describe("cupos de tinas y saunas", () => {
  it("una tina por persona", () => {
    expect(tinasNeeded(4)).toBe(4);
  });

  it("sauna: 1 a 4 personas ocupan 1 unidad, 5 o 6 ocupan 2", () => {
    expect([1, 2, 3, 4].map(saunasNeeded)).toEqual([1, 1, 1, 1]);
    expect(saunasNeeded(5)).toBe(2);
    expect(saunasNeeded(6)).toBe(2);
  });

  it("un grupo de 4 necesita 4 tinas libres en el horario", () => {
    const existing = [booking({ people: 4 }), booking({ people: 4 }), booking({ people: 1 })]; // 9 de 12
    const req = { packageId: "tina" as const, date: "2026-12-01", people: 4, kids: 0, tinaHour: 11, saunaHour: null };
    expect(validateRequest(req, existing, {})).toMatch(/No quedan 4 tinas/);
    expect(validateRequest({ ...req, people: 3 }, existing, {})).toBeNull();
  });

  it("hay 5 saunas por turno", () => {
    const existing = Array.from({ length: 5 }, () =>
      booking({ packageId: "sauna", tinaHour: null, saunaHour: 12, people: 2 }),
    );
    const req = { packageId: "sauna" as const, date: "2026-12-01", people: 1, kids: 0, tinaHour: null, saunaHour: 12 };
    expect(validateRequest(req, existing, {})).toMatch(/saunas/);
  });

  it("las reservas canceladas liberan el cupo", () => {
    const existing = Array.from({ length: 12 }, () => booking({ status: "cancelada" }));
    expect(slotStatus(existing, {}, "2026-12-01", "tina", 11).free).toBe(12);
  });

  it("los menores de 4 no ocupan tina", () => {
    const existing = [booking({ people: 2, kids: 2 })];
    expect(slotStatus(existing, {}, "2026-12-01", "tina", 11).used).toBe(2);
  });
});

describe("Día Completo", () => {
  it("bloquea tina y sauna a la misma hora", () => {
    expect(turnConflict("completo", 11, 11)).toMatch(/11:00/);
    expect(turnConflict("completo", 11, 12)).toBeNull();
  });
});

describe("mantenimiento", () => {
  it("reduce el cupo y marca sobreocupación", () => {
    const maintenance = { "2026-12-01": { tina: [11, 12], sauna: [5] } };
    expect(capacityFor(maintenance, "2026-12-01", "tina")).toBe(10);
    expect(capacityFor(maintenance, "2026-12-01", "sauna")).toBe(4);
    const existing = [booking({ people: 4 }), booking({ people: 4 }), booking({ people: 3 })];
    expect(slotStatus(existing, maintenance, "2026-12-01", "tina", 11).overbooked).toBe(true);
  });
});

describe("precios", () => {
  it("usa los precios oficiales por temporada", () => {
    expect(priceFor(DEFAULT_PRICES, "baja", "piscinas")).toBe(12000);
    expect(priceFor(DEFAULT_PRICES, "alta", "piscinas")).toBe(15000);
    expect(priceFor(DEFAULT_PRICES, "baja", "tina")).toBe(16000);
    expect(priceFor(DEFAULT_PRICES, "alta", "tina")).toBe(20000);
    expect(priceFor(DEFAULT_PRICES, "baja", "sauna")).toBe(15000);
    expect(priceFor(DEFAULT_PRICES, "alta", "sauna")).toBe(19000);
    expect(priceFor(DEFAULT_PRICES, "baja", "completo")).toBe(20000);
    expect(priceFor(DEFAULT_PRICES, "alta", "completo")).toBe(25000);
  });

  it("la clave inicial de administración es termas2026 y se guarda solo como hash", async () => {
    expect(JSON.stringify(DEFAULT_ADMIN_PASSWORD_HASH)).not.toContain("termas2026");
    expect(await verifyPassword("termas2026", DEFAULT_ADMIN_PASSWORD_HASH)).toBe(true);
    expect(await verifyPassword("otra-clave", DEFAULT_ADMIN_PASSWORD_HASH)).toBe(false);
  });

  it("una clave nueva se verifica con su hash y lleva sal propia", async () => {
    const a = await hashPassword("nueva-clave-1");
    const b = await hashPassword("nueva-clave-1");
    expect(a.salt).not.toBe(b.salt);
    expect(await verifyPassword("nueva-clave-1", a)).toBe(true);
    expect(await verifyPassword("termas2026", a)).toBe(false);
  });
});

describe("celular chileno", () => {
  it("acepta 9 dígitos que comienzan en 9, con o sin +56", () => {
    expect(normalizePhone("912345678")).toBe("912345678");
    expect(normalizePhone("+56 9 1234 5678")).toBe("912345678");
  });
  it("rechaza otros formatos", () => {
    expect(normalizePhone("812345678")).toBeNull();
    expect(normalizePhone("91234567")).toBeNull();
    expect(normalizePhone("+54 9 1234 5678")).toBeNull();
  });
});

describe("cancelaciones", () => {
  const b = booking({ date: "2026-12-10", tinaHour: 12 });
  it("con más de 24 horas se puede cancelar", () => {
    expect(canCancel(b, new Date(2026, 11, 9, 11, 0)).ok).toBe(true);
  });
  it("con menos de 24 horas se bloquea", () => {
    const r = canCancel(b, new Date(2026, 11, 9, 13, 0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("menos24");
  });
});

describe("estadísticas", () => {
  it("la facturación suma solo reservas confirmadas", () => {
    const list = [
      booking({ date: "2026-12-01", total: 32000 }),
      booking({ date: "2026-12-02", total: 50000 }),
      booking({ date: "2026-12-03", total: 99000, status: "cancelada" }),
      booking({ date: "2027-01-03", total: 10000 }),
    ];
    const month = aggregate(list, "dia", { year: 2026, month: 11 });
    expect(month.totals.facturacion).toBe(82000);
    expect(month.totals.reservas).toBe(2);
    expect(month.totals.canceladas).toBe(1);
    const years = aggregate(list, "anio", { year: 2026, month: 11 });
    expect(years.totals.facturacion).toBe(92000);
  });

  it("cuenta unidades: 1 tina por persona y 2 saunas para 5 o 6 personas", () => {
    const list = [
      booking({ date: "2026-12-01", packageId: "tina", people: 4, tinaHour: 11, saunaHour: null }),
      booking({ date: "2026-12-01", packageId: "sauna", people: 5, tinaHour: null, saunaHour: 12 }),
      booking({ date: "2026-12-02", packageId: "completo", people: 2, tinaHour: 10, saunaHour: 11 }),
      booking({ date: "2026-12-02", packageId: "tina", people: 3, status: "cancelada" }),
    ];
    const { totals, buckets } = aggregate(list, "dia", { year: 2026, month: 11 });
    expect(totals.tinas).toBe(6);
    expect(totals.saunas).toBe(3);
    expect(totals.canceladas).toBe(1);
    expect(buckets[0]).toMatchObject({ tinas: 4, saunas: 2, reservas: 2 });
  });

  it("la suma de los días coincide con el total del mes", () => {
    const { bookings } = buildSampleData(new Date(2026, 10, 14, 12), DEFAULT_PRICES);
    const days = aggregate(bookings, "dia", { year: 2026, month: 9 });
    const months = aggregate(bookings, "mes", { year: 2026, month: 9 });
    const oct = months.buckets.find((b) => b.key === "2026-10")!;
    expect(days.totals.facturacion).toBe(oct.facturacion);
    const expected = bookings
      .filter((b) => b.date.startsWith("2026-10") && b.status === "confirmada")
      .reduce((s, b) => s + b.total, 0);
    expect(oct.facturacion).toBe(expected);
  });
});

describe("datos de ejemplo", () => {
  it("respetan los cupos salvo la sobreocupación de prueba de hoy", () => {
    const now = new Date(2026, 10, 14, 12);
    const { bookings, maintenance } = buildSampleData(now, DEFAULT_PRICES);
    const over = slotStatus(bookings, maintenance, "2026-11-14", "tina", 12);
    expect(over.overbooked).toBe(true);
    const tomorrow = slotStatus(bookings, maintenance, "2026-11-15", "tina", 12);
    expect(tomorrow.overbooked).toBe(false);
  });
});

describe("comprobantes", () => {
  it("genera un PDF y un .ics válidos", () => {
    const b = booking({ packageId: "completo", saunaHour: 14 });
    const pdf = new TextDecoder("latin1").decode(buildPdf(b));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trim().endsWith("%%EOF")).toBe(true);
    const ics = buildIcs(b);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });
});
