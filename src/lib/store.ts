import { useSyncExternalStore } from "react";

import { hashPassword, isPasswordHash, verifyPassword } from "./password";
import { buildSampleData } from "./seed";
import {
  canCancel,
  defaultSettings,
  generateCode,
  priceFor,
  totalFor,
  validateRequest,
  type Attendance,
  type Booking,
  type BookingRequest,
  type PackageId,
  type ResourceKind,
  type Season,
  type Settings,
  type TurnKey,
} from "./termas";

/** Todo vive en localStorage del navegador: no hay servidor ni base de datos. */
export const STORAGE_KEYS = {
  bookings: "termas-punulaf:bookings",
  settings: "termas-punulaf:settings",
} as const;
const SESSION_KEY = "termas-punulaf:admin-session";

export interface TermasState {
  ready: boolean;
  bookings: Booking[];
  settings: Settings;
}

const SERVER_STATE: TermasState = { ready: false, bookings: [], settings: defaultSettings() };
let cache: TermasState | null = null;
const listeners = new Set<() => void>();

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function persist(state: Omit<TermasState, "ready">) {
  window.localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(state.bookings));
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function load(): TermasState {
  const storedSettings = readJSON<Partial<Settings>>(STORAGE_KEYS.settings);
  const storedBookings = readJSON<Booking[]>(STORAGE_KEYS.bookings);
  if (!storedSettings || !storedBookings) {
    const settings = defaultSettings();
    const sample = buildSampleData(new Date(), settings.prices);
    settings.maintenance = sample.maintenance;
    persist({ bookings: sample.bookings, settings });
    return { ready: true, bookings: sample.bookings, settings };
  }
  const base = defaultSettings();
  // Versiones anteriores guardaban la clave en texto plano: se elimina y se migra a hash.
  const { adminPassword: legacyPlain, ...rest } = storedSettings as Partial<Settings> & { adminPassword?: unknown };
  const settings: Settings = {
    ...base,
    ...rest,
    adminPasswordHash: isPasswordHash(rest.adminPasswordHash) ? rest.adminPasswordHash : base.adminPasswordHash,
    prices: { ...base.prices, ...(rest.prices ?? {}) },
    maintenance: rest.maintenance ?? {},
  };
  if (legacyPlain !== undefined) {
    persist({ bookings: storedBookings, settings });
    if (typeof legacyPlain === "string" && legacyPlain && !isPasswordHash(rest.adminPasswordHash)) {
      void hashPassword(legacyPlain).then((h) =>
        update((s) => ({ bookings: s.bookings, settings: { ...s.settings, adminPasswordHash: h } })),
      );
    }
  }
  return { ready: true, bookings: storedBookings, settings };
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith("termas-punulaf:")) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): TermasState {
  if (!cache) cache = load();
  return cache;
}

export function useTermas(): TermasState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

function update(fn: (s: TermasState) => Omit<TermasState, "ready">) {
  const next = fn(getSnapshot());
  persist(next);
  cache = { ready: true, ...next };
  emit();
}

// ---------- Reservas ----------

export interface NewBookingInput extends BookingRequest {
  name: string;
  phone: string;
  email: string;
}

export function createBooking(
  input: NewBookingInput,
): { ok: true; booking: Booking } | { ok: false; error: string } {
  const state = getSnapshot();
  const error = validateRequest(input, state.bookings, state.settings.maintenance);
  if (error) return { ok: false, error };
  const season = state.settings.season;
  const unitPrice = priceFor(state.settings.prices, season, input.packageId);
  const booking: Booking = {
    id: crypto.randomUUID(),
    code: generateCode(new Set(state.bookings.map((b) => b.code))),
    packageId: input.packageId,
    date: input.date,
    people: input.people,
    kids: input.kids,
    tinaHour: input.tinaHour,
    saunaHour: input.saunaHour,
    name: input.name.trim(),
    phone: input.phone,
    email: input.email.trim(),
    season,
    unitPrice,
    total: totalFor(unitPrice, input.people),
    status: "confirmada",
    createdAt: new Date().toISOString(),
    cancelledAt: null,
    attendance: {},
    sample: false,
  };
  update((s) => ({ settings: s.settings, bookings: [...s.bookings, booking] }));
  return { ok: true, booking };
}

export function cancelBooking(id: string): { ok: true } | { ok: false; message: string } {
  const b = getSnapshot().bookings.find((x) => x.id === id);
  if (!b) return { ok: false, message: "No se encontró la reserva." };
  const check = canCancel(b, new Date());
  if (!check.ok) return { ok: false, message: check.message };
  update((s) => ({
    settings: s.settings,
    bookings: s.bookings.map((x) =>
      x.id === id ? { ...x, status: "cancelada", cancelledAt: new Date().toISOString() } : x,
    ),
  }));
  return { ok: true };
}

export function setAttendance(id: string, turn: TurnKey, value: Attendance | null) {
  update((s) => ({
    settings: s.settings,
    bookings: s.bookings.map((x) => {
      if (x.id !== id) return x;
      const attendance = { ...x.attendance };
      if (value) attendance[turn] = value;
      else delete attendance[turn];
      return { ...x, attendance };
    }),
  }));
}

// ---------- Administración ----------

export function setSeason(season: Season) {
  update((s) => ({ bookings: s.bookings, settings: { ...s.settings, season } }));
}

export function setPackagePrices(packageId: PackageId, prices: Record<Season, number>) {
  update((s) => ({
    bookings: s.bookings,
    settings: { ...s.settings, prices: { ...s.settings.prices, [packageId]: prices } },
  }));
}

export async function setAdminPassword(password: string) {
  const adminPasswordHash = await hashPassword(password);
  update((s) => ({ bookings: s.bookings, settings: { ...s.settings, adminPasswordHash } }));
  // La sesión actual sigue activa con la clave nueva; las sesiones con la clave anterior caducan.
  window.sessionStorage.setItem(SESSION_KEY, adminPasswordHash.hash);
  emitSession();
}

export function toggleOutOfService(date: string, kind: ResourceKind, unit: number) {
  update((s) => {
    const day = s.settings.maintenance[date] ?? { tina: [], sauna: [] };
    const list = day[kind] ?? [];
    const nextList = list.includes(unit) ? list.filter((n) => n !== unit) : [...list, unit].sort((a, b) => a - b);
    return {
      bookings: s.bookings,
      settings: {
        ...s.settings,
        maintenance: { ...s.settings.maintenance, [date]: { ...day, [kind]: nextList } },
      },
    };
  });
}

export function deleteSampleData() {
  update((s) => ({ settings: s.settings, bookings: s.bookings.filter((b) => !b.sample) }));
}

/** Vuelve a cargar los datos de ejemplo conservando las reservas reales, precios y clave. */
export function restoreSampleData() {
  update((s) => {
    const sample = buildSampleData(new Date(), s.settings.prices);
    return {
      settings: { ...s.settings, maintenance: { ...s.settings.maintenance, ...sample.maintenance } },
      bookings: [...s.bookings.filter((b) => !b.sample), ...sample.bookings],
    };
  });
}

// ---------- Sesión de administración (por pestaña) ----------
// La sesión queda ligada al hash vigente: cambiar la clave invalida las sesiones anteriores.

const sessionListeners = new Set<() => void>();

function emitSession() {
  sessionListeners.forEach((l) => l());
}

function subscribeSession(l: () => void) {
  sessionListeners.add(l);
  const unsubscribeStore = subscribe(l);
  return () => {
    sessionListeners.delete(l);
    unsubscribeStore();
  };
}

export function useAdminSession(): boolean {
  return useSyncExternalStore(
    subscribeSession,
    () => window.sessionStorage.getItem(SESSION_KEY) === getSnapshot().settings.adminPasswordHash.hash,
    () => false,
  );
}

export async function loginAdmin(password: string): Promise<boolean> {
  const stored = getSnapshot().settings.adminPasswordHash;
  if (!(await verifyPassword(password, stored))) return false;
  window.sessionStorage.setItem(SESSION_KEY, stored.hash);
  emitSession();
  return true;
}

export function logoutAdmin() {
  window.sessionStorage.removeItem(SESSION_KEY);
  emitSession();
}
