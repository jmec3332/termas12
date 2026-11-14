import { useState } from "react";
import { PhoneCall, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/store";
import { canCancel, type Booking } from "@/lib/termas";

/** Botón de cancelación con la regla de 24 horas. */
export function CancelAction({ booking, size = "default" }: { booking: Booking; size?: "default" | "sm" }) {
  const [now] = useState(() => new Date());
  const check = canCancel(booking, now);

  if (booking.status === "cancelada") return null;
  if (!check.ok) {
    return (
      <p className={`flex gap-2 rounded-lg bg-destructive-soft p-3 font-bold text-destructive ${size === "sm" ? "text-xs" : "text-sm"}`}>
        <PhoneCall className="mt-0.5 size-4 shrink-0" />
        {check.message}
      </p>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={size} className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive">
          <XCircle /> Cancelar visita
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar la reserva {booking.code}?</AlertDialogTitle>
          <AlertDialogDescription>
            Faltan más de 24 horas, así que los turnos se liberan de inmediato para otras personas. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mantener reserva</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              const r = cancelBooking(booking.id);
              if (r.ok) toast.success(`Reserva ${booking.code} cancelada. Los turnos quedaron libres.`);
              else toast.error(r.message);
            }}
          >
            Sí, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
