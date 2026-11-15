import { useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/page-header";
import { adminLogin } from "@/lib/admin-auth.functions";
import { useTermas } from "@/lib/store";

/**
 * Muestra el contenido solo si el servidor confirmó la sesión de administración
 * (`authed` viene del beforeLoad de la ruta). La clave se verifica en el servidor.
 */
export function AdminGate({ title, authed, children }: { title: string; authed: boolean; children: ReactNode }) {
  const { ready } = useTermas();
  const router = useRouter();
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (authed) return ready ? <>{children}</> : <Loading />;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <form
        className="rounded-2xl border bg-card p-6 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!password) return setError("Ingresa la clave.");
          setChecking(true);
          try {
            const res = await login({ data: { password } });
            if (res.ok) {
              setError("");
              setPassword("");
              await router.invalidate();
            } else {
              setError("Clave incorrecta. Revisa e intenta de nuevo.");
            }
          } catch {
            setError("No se pudo verificar la clave. Intenta de nuevo.");
          } finally {
            setChecking(false);
          }
        }}
      >
        <div className="mb-4 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
          <Lock className="size-5" />
        </div>
        <h1 className="text-xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acceso solo para el equipo del recinto.</p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="admin-password">Clave</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
          />
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="mt-5 w-full" size="lg" disabled={checking}>
          {checking ? "Verificando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
