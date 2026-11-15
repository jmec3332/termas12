import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { isAdminSession, loginWithPassword, logoutSession, replacePassword } from "./admin-auth.server";

/** ¿La petición trae una sesión de administración válida? (verificado en el servidor) */
export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("cache-control", "no-store");
  return { authed: await isAdminSession() };
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "no-store");
    return { ok: await loginWithPassword(data.password) };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await logoutSession();
  return { ok: true };
});

export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().trim().min(6).max(200) }).parse(data))
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "no-store");
    const ok = await replacePassword(data.password);
    return ok ? { ok: true as const } : { ok: false as const, error: "La sesión expiró. Vuelve a ingresar la clave." };
  });
