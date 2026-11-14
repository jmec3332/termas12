import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { BookingCard } from "@/components/booking-card";
import { CancelAction } from "@/components/cancel-action";
import { Loading, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_CODE, DEMO_PHONE } from "@/lib/seed";
import { useTermas } from "@/lib/store";
import { formatPhone, normalizeCode, normalizePhone } from "@/lib/termas";

export const Route = createFileRoute("/mi-visita")({
  head: () => ({
    meta: [
      { title: "Mi visita · Termas Punulaf" },
      { name: "description", content: "Consulta o cancela tu reserva en Termas Punulaf con el código y tu celular." },
      { property: "og:title", content: "Mi visita · Termas Punulaf" },
      { property: "og:description", content: "Consulta o cancela tu reserva en Termas Punulaf con el código y tu celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MiVisitaPage,
});

function MiVisitaPage() {
  const { ready, bookings } = useTermas();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [foundId, setFoundId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!ready) return <Loading />;
  const found = foundId ? bookings.find((b) => b.id === foundId) : null;
  const hasDemo = bookings.some((b) => b.code === DEMO_CODE);

  return (
    <>
      <PageHeader eyebrow="Mi visita" title="Consulta tu reserva">
        Busca tu reserva con el código y el celular que dejaste.
      </PageHeader>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[320px_1fr] md:px-6">
        <form
          className="h-fit space-y-4 rounded-2xl border bg-card p-4 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            const c = normalizeCode(code);
            const p = normalizePhone(phone);
            if (!c || !p) {
              setFoundId(null);
              setError(!c ? "Ingresa el código de reserva." : "El celular debe tener 9 dígitos y comenzar en 9.");
              return;
            }
            const b = bookings.find((x) => x.code === c && x.phone === p);
            setFoundId(b?.id ?? null);
            setError(b ? "" : "No hay una reserva con ese código y celular. Revisa los datos.");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de reserva</Label>
            <Input id="code" placeholder="PUN-XXXX" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-phone">Celular</Label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-bold">+56</span>
              <Input id="visit-phone" type="tel" inputMode="numeric" placeholder="9 1234 5678" className="rounded-l-none" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <Button type="submit" variant="hero" size="lg" className="w-full">
            <Search /> Buscar reserva
          </Button>
          {hasDemo && (
            <p className="rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
              Para probar: código <strong className="text-foreground">{DEMO_CODE}</strong> y celular{" "}
              <strong className="text-foreground">{formatPhone(DEMO_PHONE)}</strong>.
            </p>
          )}
        </form>

        <div>
          {found ? (
            <BookingCard booking={found} footer={<CancelAction booking={found} />} />
          ) : (
            <div className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
              <div>
                <p>Aquí aparecerá el detalle de la reserva.</p>
                <p className="mt-2 text-sm">
                  ¿Aún sin reserva?{" "}
                  <Link to="/reservar" className="font-bold text-primary underline underline-offset-4">
                    Reservar ahora
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
