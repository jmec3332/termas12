import type { PasswordHash } from "./password";

/**
 * Hash (PBKDF2-SHA256) de la clave inicial de administración. Solo existe en el servidor:
 * la clave en texto plano no está en el código y está documentada en el README.
 */
export const DEFAULT_ADMIN_PASSWORD_HASH: PasswordHash = {
  salt: "7f3c9a1e5b2d4c8f0a6e1d3b9c7f2a54",
  iterations: 100_000,
  hash: "13558d774f1ae0d17c1b8cb2fabf7dd6c182f5fa4c8fc4168392d88e2230b23a",
};
