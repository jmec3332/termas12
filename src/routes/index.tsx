import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Flame, Waves } from "lucide-react";

import heroImg from "@/assets/termas-hero.jpg";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRICES, formatCLP, SAUNA_UNITS, TINA_UNITS } from "@/lib/termas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Termas Punulaf · Tinas, saunas y piscinas termales" },
      { name: "description", content: "Reserva en línea tu tina o sauna en Termas Punulaf. Piscinas termales libres todo el día, de 10:00 a 18:00." },
      { property: "og:title", content: "Termas Punulaf · Tinas, saunas y piscinas termales" },
      { property: "og:description", content: "Reserva en línea tu tina o sauna en Termas Punulaf. Piscinas termales libres todo el día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Tinas de madera humeantes frente a la cordillera al atardecer"
          width={1600}
          height={1072}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-hero-gradient" />
        <div className="mx-auto flex min-h-[calc(100svh-7.5rem)] max-w-6xl flex-col justify-center px-4 py-10 text-on-photo md:min-h-[620px] md:px-6">
          <p className="animate-rise text-xs font-black uppercase tracking-[0.25em] text-accent">Agua termal · Sur de Chile</p>
          <h1 className="animate-rise mt-3 max-w-xl text-4xl font-black leading-tight md:text-6xl" style={{ animationDelay: "80ms" }}>
            Tinas, saunas y piscinas entre bosque y cordillera
          </h1>
          <p className="animate-rise mt-4 max-w-md text-base text-on-photo/90 md:text-lg" style={{ animationDelay: "160ms" }}>
            Elige paquete, día y horario. La reserva queda lista en un par de minutos.
          </p>
          <div className="animate-rise mt-7 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
            <Button asChild variant="hero" size="xl">
              <Link to="/reservar">
                Reservar ahora <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="photo" size="xl">
              <Link to="/mi-visita">Mi visita</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Waves className="size-5" />}
            tone="tina"
            title={`${TINA_UNITS} tinas individuales`}
            text="Turnos de 45 minutos, cada hora en punto. Una tina por persona; los menores de 4 años comparten la del adulto."
          />
          <Feature
            icon={<Flame className="size-5" />}
            tone="sauna"
            title={`${SAUNA_UNITS} saunas privados`}
            text="Turnos de 30 minutos para grupos de 1 a 4 personas. Grupos de 5 o 6 usan dos saunas."
          />
          <Feature
            icon={<Clock className="size-5" />}
            tone="moss"
            title="Piscinas libres"
            text={`Incluidas en todos los paquetes, sin turnos. Solo piscinas desde ${formatCLP(DEFAULT_PRICES.piscinas.baja)} por persona.`}
          />
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: "tina" | "sauna" | "moss" }) {
  const toneClass = tone === "tina" ? "bg-tina text-tina-foreground" : tone === "sauna" ? "bg-sauna text-sauna-foreground" : "bg-moss text-primary-foreground";
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className={`grid size-10 place-items-center rounded-full ${toneClass}`}>{icon}</div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
