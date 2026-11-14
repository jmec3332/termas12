import { VENUE_PHONE } from "@/lib/termas";

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between md:px-6">
        <p>
          <span className="font-display font-bold text-foreground">Termas Punulaf</span> · Abierto todos los días de 10:00 a 18:00
        </p>
        <p>Contacto: {VENUE_PHONE}</p>
      </div>
    </footer>
  );
}
