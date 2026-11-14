import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/page-header";
import { loginAdmin, useAdminSession, useTermas } from "@/lib/store";

/** Pide la clave de administración (la misma para /admin y /graficos) antes de mostrar el contenido. */
export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { ready } = useTermas();
  const authed = useAdminSession();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!ready) return <Loading />;
  if (authed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <form
        className="rounded-2xl border bg-card p-6 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (loginAdmin(password)) setError("");
          else setError("Clave incorrecta. Revisa e intenta de nuevo.");
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
        <Button type="submit" className="mt-5 w-full" size="lg">
          Entrar
        </Button>
      </form>
    </div>
  );
}
