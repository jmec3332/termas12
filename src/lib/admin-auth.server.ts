/**
 * Verificación de la clave de administración en el servidor.
 * - La clave se compara aquí (nunca en el navegador) contra un hash PBKDF2.
 * - La sesión es una cookie HttpOnly cifrada con ADMIN_SESSION_SECRET: el navegador no puede leerla ni falsificarla.
 * - Una clave cambiada desde /admin se guarda como hash en una cookie HttpOnly firmada (HMAC);
 *   así se mantiene el modelo "todo por navegador" del encargo sin base de datos.
 */
import { getCookie, setCookie, useSession as getSessionManager } from "@tanstack/react-start/server";

import { DEFAULT_ADMIN_PASSWORD_HASH } from "./admin-default.server";
import { hashPassword, isPasswordHash, verifyPassword, type PasswordHash } from "./password";

const SESSION_NAME = "tp_admin_session";
const PASSWORD_COOKIE = "tp_admin_pwd";
const SESSION_MAX_AGE = 8 * 60 * 60;
const PASSWORD_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60;

interface AdminSessionData {
  admin?: boolean;
  /** Huella del hash vigente: si la clave cambia, las sesiones anteriores dejan de valer. */
  fp?: string;
}

// SameSite=None + Partitioned permite que la cookie funcione dentro de la vista previa embebida.
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  partitioned: true,
  path: "/",
};

function getSecret(): string {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET no está configurado");
  return secret;
}

function sessionConfig() {
  return {
    password: getSecret(),
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE,
    sessionHeader: false as const,
    cookie: { ...cookieOptions, maxAge: SESSION_MAX_AGE },
  };
}

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function fingerprint(h: PasswordHash): string {
  return h.hash.slice(0, 24);
}

/** Hash vigente: el de la clave cambiada (si su firma es válida) o el inicial. */
async function getEffectiveHash(): Promise<PasswordHash> {
  const raw = getCookie(PASSWORD_COOKIE);
  if (!raw) return DEFAULT_ADMIN_PASSWORD_HASH;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !sameString(await hmac(payload), sig)) return DEFAULT_ADMIN_PASSWORD_HASH;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(payload));
    return isPasswordHash(parsed) ? parsed : DEFAULT_ADMIN_PASSWORD_HASH;
  } catch {
    return DEFAULT_ADMIN_PASSWORD_HASH;
  }
}

export async function isAdminSession(): Promise<boolean> {
  const session = await getSessionManager<AdminSessionData>(sessionConfig());
  if (session.data.admin !== true || !session.data.fp) return false;
  return sameString(session.data.fp, fingerprint(await getEffectiveHash()));
}

export async function loginWithPassword(password: string): Promise<boolean> {
  const current = await getEffectiveHash();
  if (!(await verifyPassword(password, current))) return false;
  const session = await getSessionManager<AdminSessionData>(sessionConfig());
  await session.update({ admin: true, fp: fingerprint(current) });
  return true;
}

export async function logoutSession(): Promise<void> {
  const session = await getSessionManager<AdminSessionData>(sessionConfig());
  await session.clear();
}

export async function replacePassword(newPassword: string): Promise<boolean> {
  if (!(await isAdminSession())) return false;
  const next = await hashPassword(newPassword);
  const payload = toBase64Url(JSON.stringify(next));
  setCookie(PASSWORD_COOKIE, `${payload}.${await hmac(payload)}`, { ...cookieOptions, maxAge: PASSWORD_COOKIE_MAX_AGE });
  const session = await getSessionManager<AdminSessionData>(sessionConfig());
  await session.update({ admin: true, fp: fingerprint(next) });
  return true;
}
