import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { BarChart } from "@/components/bar-chart";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { useTermas } from "@/lib/store";
import { aggregate, formatCLP, MONTHS_LONG, type Granularity } from "@/lib/termas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos · Termas Punulaf" },
      { name: "description", content: "Reservas, cancelaciones, facturación y unidades de Termas Punulaf por día, mes y año." },
      { property: "og:title", content: "Gráficos · Termas Punulaf" },
      { property: "og:description", content: "Reservas, cancelaciones, facturación y unidades por día, mes y año." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate title="Gráficos">
      <Graficos />
    </AdminGate>
  ),
});

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "dia", label: "Por día" },
  { id: "mes", label: "Por mes" },
  { id: "anio", label: "Por año" },
];

const selectClass = "h-10 rounded-md border border-input bg-card px-3 text-sm font-bold";

function Graficos() {
  const { bookings } = useTermas();
  const [now] = useState(() => new Date());
  const [granularity, setGranularity] = useState<Granularity>("dia");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const years = useMemo(() => {
    const set = new Set(bookings.map((b) => Number(b.date.slice(0, 4))));
    set.add(now.getFullYear());
    return [...set].sort((a, b) => a - b);
  }, [bookings, now]);

  const { buckets, totals } = useMemo(() => aggregate(bookings, granularity, { year, month }), [bookings, granularity, year, month]);
  const period =
    granularity === "dia" ? `${MONTHS_LONG[month]} ${year}` : granularity === "mes" ? `Año ${year}` : "Todos los años";

  const series = (key: keyof (typeof buckets)[number]) => buckets.map((b) => ({ label: b.label, value: Number(b[key]) }));

  return (
    <>
      <PageHeader eyebrow="Panel" title="Gráficos de reservas">
        Reservas, cancelaciones, facturación y unidades según la fecha de visita.
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-secondary p-1" role="tablist">
            {GRANULARITIES.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={granularity === g.id}
                onClick={() => setGranularity(g.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  granularity === g.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {granularity === "dia" && (
              <select aria-label="Mes" className={selectClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            )}
            {granularity !== "anio" && (
              <select aria-label="Año" className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
            <LogoutButton />
          </div>
        </div>

        <section aria-label="Totales">
          <h2 className="mb-3 text-lg font-bold">Totales · {period}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Reservas confirmadas" value={String(totals.reservas)} />
            <Stat label="Cancelaciones" value={String(totals.canceladas)} tone="alert" />
            <Stat label="Facturación" value={formatCLP(totals.facturacion)} tone="accent" />
            <Stat label="Personas" value={String(totals.personas)} />
            <Stat label="Tinas usadas" value={String(totals.tinas)} tone="tina" />
            <Stat label="Saunas usados" value={String(totals.saunas)} tone="sauna" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            La facturación suma el total de las reservas confirmadas (las canceladas no facturan). Unidades = tinas o saunas ocupados por turno.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Reservas confirmadas" total={String(totals.reservas)}>
            <BarChart data={series("reservas")} barClassName="bg-primary" />
          </ChartCard>
          <ChartCard title="Cancelaciones" total={String(totals.canceladas)}>
            <BarChart data={series("canceladas")} barClassName="bg-destructive" />
          </ChartCard>
          <ChartCard title="Facturación" total={formatCLP(totals.facturacion)} className="lg:col-span-2">
            <BarChart data={series("facturacion")} barClassName="bg-accent" format={formatCLP} />
          </ChartCard>
          <ChartCard title="Unidades de tina" total={String(totals.tinas)}>
            <BarChart data={series("tinas")} barClassName="bg-tina" />
          </ChartCard>
          <ChartCard title="Unidades de sauna" total={String(totals.saunas)}>
            <BarChart data={series("saunas")} barClassName="bg-sauna" />
          </ChartCard>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "alert" | "accent" | "tina" | "sauna" }) {
  const toneClass =
    tone === "alert" ? "text-destructive" : tone === "accent" ? "text-primary" : tone === "tina" ? "text-tina" : tone === "sauna" ? "text-sauna-foreground" : "text-foreground";
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", tone === "accent" && "border-accent/50 bg-sauna-soft")}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-black tabular md:text-2xl", toneClass)}>{value}</p>
    </div>
  );
}

function ChartCard({ title, total, children, className }: { title: string; total: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="font-display font-black tabular">{total}</span>
      </div>
      {children}
    </section>
  );
}
