/**
 * Hash de la clave de administración con PBKDF2-SHA256 (WebCrypto).
 * La clave nunca se guarda ni se compila en texto plano: solo sal + hash.
 */
export interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

// El servidor (Cloudflare Workers) admite como máximo 100.000 iteraciones de PBKDF2.
const ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, saltHex: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex) as BufferSource, iterations },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, iterations: ITERATIONS, hash: await derive(password, salt, ITERATIONS) };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  if (!stored?.salt || !stored?.hash) return false;
  const candidate = await derive(password, stored.salt, stored.iterations || ITERATIONS);
  if (candidate.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

export function isPasswordHash(v: unknown): v is PasswordHash {
  return !!v && typeof v === "object" && typeof (v as PasswordHash).salt === "string" && typeof (v as PasswordHash).hash === "string";
}
