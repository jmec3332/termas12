import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/admin-gate";
import { BarChart, GroupedBarChart } from "@/components/bar-chart";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { useTermas } from "@/lib/store";
import { aggregate, formatCLP, MONTHS_LONG, type Granularity } from "@/lib/termas";
import { getAdminStatus } from "@/lib/admin-auth.functions";
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
  beforeLoad: async () => ({ adminAuthed: (await getAdminStatus()).authed }),
  component: GraficosRoute,
});

function GraficosRoute() {
  const { adminAuthed } = Route.useRouteContext();
  return (
    <AdminGate title="Gráficos" authed={adminAuthed}>
      <Graficos />
    </AdminGate>
  );
}

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

        <section aria-label="Totales" className="space-y-3">
          <h2 className="text-lg font-bold">Totales · {period}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Reservas confirmadas" value={String(totals.reservas)} />
            <Stat label="Cancelaciones" value={String(totals.canceladas)} tone="alert" />
            <Stat label="Facturación" value={formatCLP(totals.facturacion)} tone="accent" className="col-span-2 md:col-span-1" />
          </div>
          <h3 className="pt-1 text-sm font-black uppercase tracking-wide text-muted-foreground">Unidades</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total unidades" value={String(totals.tinas + totals.saunas)} />
            <Stat label="Tinas" value={String(totals.tinas)} tone="tina" />
            <Stat label="Saunas" value={String(totals.saunas)} tone="sauna" />
            <Stat label="Personas" value={String(totals.personas)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Unidades = tinas o saunas ocupados por turno en reservas confirmadas. La facturación no incluye las canceladas.
          </p>
        </section>

        <div className="grid gap-4">
          <ChartCard title="Reservas y cancelaciones" total={`${totals.reservas} / ${totals.canceladas}`}>
            <GroupedBarChart
              rows={buckets.map((b) => ({ label: b.label, values: { reservas: b.reservas, canceladas: b.canceladas } }))}
              series={[
                { key: "reservas", label: "Reservas", className: "bg-primary" },
                { key: "canceladas", label: "Cancelaciones", className: "bg-destructive" },
              ]}
            />
          </ChartCard>
          <ChartCard title="Unidades usadas" total={String(totals.tinas + totals.saunas)}>
            <GroupedBarChart
              rows={buckets.map((b) => ({ label: b.label, values: { tinas: b.tinas, saunas: b.saunas } }))}
              series={[
                { key: "tinas", label: "Tinas", className: "bg-tina" },
                { key: "saunas", label: "Saunas", className: "bg-sauna" },
              ]}
            />
          </ChartCard>
          <ChartCard title="Facturación" total={formatCLP(totals.facturacion)}>
            <BarChart data={series("facturacion")} barClassName="bg-accent" format={formatCLP} />
          </ChartCard>
        </div>

        <section className="rounded-2xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-base font-bold">Detalle · {period}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tabular">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2">{granularity === "dia" ? "Día" : granularity === "mes" ? "Mes" : "Año"}</th>
                  <th className="py-2 pr-2 text-right">Reservas</th>
                  <th className="py-2 pr-2 text-right">Cancel.</th>
                  <th className="py-2 pr-2 text-right">Tinas</th>
                  <th className="py-2 pr-2 text-right">Saunas</th>
                  <th className="py-2 pr-2 text-right">Unidades</th>
                  <th className="py-2 text-right">Facturación</th>
                </tr>
              </thead>
              <tbody>
                {buckets
                  .filter((b) => b.reservas + b.canceladas > 0)
                  .map((b) => (
                    <tr key={b.key} className="border-b border-border/60">
                      <td className="py-1.5 pr-2 font-bold">{b.label}</td>
                      <td className="py-1.5 pr-2 text-right">{b.reservas}</td>
                      <td className="py-1.5 pr-2 text-right text-destructive">{b.canceladas}</td>
                      <td className="py-1.5 pr-2 text-right text-tina">{b.tinas}</td>
                      <td className="py-1.5 pr-2 text-right text-sauna-foreground">{b.saunas}</td>
                      <td className="py-1.5 pr-2 text-right">{b.tinas + b.saunas}</td>
                      <td className="py-1.5 text-right">{formatCLP(b.facturacion)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="font-black">
                  <td className="pt-2 pr-2">Total</td>
                  <td className="pt-2 pr-2 text-right">{totals.reservas}</td>
                  <td className="pt-2 pr-2 text-right text-destructive">{totals.canceladas}</td>
                  <td className="pt-2 pr-2 text-right text-tina">{totals.tinas}</td>
                  <td className="pt-2 pr-2 text-right text-sauna-foreground">{totals.saunas}</td>
                  <td className="pt-2 pr-2 text-right">{totals.tinas + totals.saunas}</td>
                  <td className="pt-2 text-right">{formatCLP(totals.facturacion)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, tone, className }: { label: string; value: string; tone?: "alert" | "accent" | "tina" | "sauna"; className?: string }) {
  const toneClass =
    tone === "alert" ? "text-destructive" : tone === "accent" ? "text-primary" : tone === "tina" ? "text-tina" : tone === "sauna" ? "text-sauna-foreground" : "text-foreground";
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", tone === "accent" && "border-accent/50 bg-sauna-soft", className)}>
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
