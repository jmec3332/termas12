import type { ReactNode } from "react";
import { CalendarPlus, FileDown, Info, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadIcs, downloadPdf, VISIT_NOTICE, whatsappLink } from "@/lib/exports";
import {
  formatCLP,
  formatDateLong,
  formatPhone,
  formatTurn,
  PACKAGES,
  type Booking,
} from "@/lib/termas";

export function TurnChip({ kind, hour }: { kind: "tina" | "sauna"; hour: number }) {
  return (
    <span
      className={
        kind === "tina"
          ? "inline-flex items-center gap-1.5 rounded-full bg-tina-soft px-3 py-1 text-sm font-bold text-tina"
          : "inline-flex items-center gap-1.5 rounded-full bg-sauna-soft px-3 py-1 text-sm font-bold text-sauna-foreground"
      }
    >
      <span aria-hidden className={kind === "tina" ? "size-2 rounded-full bg-tina" : "size-2 rounded-sm bg-sauna"} />
      {kind === "tina" ? "Tina" : "Sauna"} {formatTurn(kind, hour)}
    </span>
  );
}

export function BookingCard({ booking, footer }: { booking: Booking; footer?: ReactNode }) {
  const cancelled = booking.status === "cancelada";
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex items-start justify-between gap-3 bg-primary px-5 py-4 text-primary-foreground">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">Código de reserva</p>
          <p className="font-display text-2xl font-black tracking-wide text-accent">{booking.code}</p>
        </div>
        <Badge variant={cancelled ? "alert" : "moss"} className="mt-1 shrink-0">
          {cancelled ? "Cancelada" : "Confirmada"}
        </Badge>
      </div>
      <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
        <Item label="Paquete">{PACKAGES[booking.packageId].name}</Item>
        <Item label="Fecha">
          <span className="capitalize">{formatDateLong(booking.date)}</span>
        </Item>
        <Item label="Grupo">
          {booking.people} {booking.people === 1 ? "persona" : "personas"}
          {booking.kids > 0 && ` + ${booking.kids} menor${booking.kids > 1 ? "es" : ""} de 4 (sin cargo)`}
        </Item>
        <Item label="A nombre de">
          {booking.name} · {formatPhone(booking.phone)}
        </Item>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Horarios</dt>
          <dd className="mt-1.5 flex flex-wrap gap-2">
            {booking.tinaHour !== null && <TurnChip kind="tina" hour={booking.tinaHour} />}
            {booking.saunaHour !== null && <TurnChip kind="sauna" hour={booking.saunaHour} />}
            <span className="inline-flex items-center rounded-full bg-moss-soft px-3 py-1 text-sm font-bold text-primary">
              Piscinas libres todo el día
            </span>
          </dd>
        </div>
        <Item label="Total">
          <span className="font-display text-lg font-black">{formatCLP(booking.total)}</span>
          <span className="block text-xs text-muted-foreground">
            {formatCLP(booking.unitPrice)} por persona · temporada {booking.season}
          </span>
        </Item>
      </dl>
      {!cancelled && (
        <>
          <div className="mx-5 mb-4 flex gap-2 rounded-xl bg-sauna-soft p-3 text-sm text-sauna-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p className="font-bold">{VISIT_NOTICE}</p>
          </div>
          <div className="grid gap-2 border-t px-5 py-4 sm:grid-cols-3">
            <Button asChild variant="moss">
              <a href={whatsappLink(booking)} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={() => downloadIcs(booking)}>
              <CalendarPlus /> Calendario (.ics)
            </Button>
            <Button variant="outline" onClick={() => downloadPdf(booking)}>
              <FileDown /> Descargar PDF
            </Button>
          </div>
        </>
      )}
      {footer && <div className="border-t px-5 py-4">{footer}</div>}
    </article>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-bold">{children}</dd>
    </div>
  );
}
