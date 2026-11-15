import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
}

/** Gráfico de barras simple en CSS, se desplaza horizontalmente en móvil. */
export function BarChart({
  data,
  barClassName,
  format = (n) => String(n),
}: {
  data: BarDatum[];
  barClassName: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const minWidth = Math.max(data.length * 26, 260);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex h-44 items-end gap-1 border-b border-border" style={{ minWidth }}>
        {data.map((d, i) => (
          <div key={i} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[10px] font-bold text-muted-foreground tabular opacity-0 transition-opacity group-hover:opacity-100">
              {d.value > 0 ? format(d.value) : ""}
            </span>
            <div
              className={cn("w-full max-w-10 rounded-t-md transition-all", barClassName, d.value === 0 && "opacity-20")}
              style={{ height: `${Math.max(d.value === 0 ? 2 : 4, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${format(d.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1" style={{ minWidth }}>
        {data.map((d, i) => (
          <span key={i} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground tabular">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface BarSeries {
  key: string;
  label: string;
  className: string;
}

/** Barras agrupadas (una por serie) para comparar valores en cada período. */
export function GroupedBarChart({
  rows,
  series,
  format = (n) => String(n),
}: {
  rows: { label: string; values: Record<string, number> }[];
  series: BarSeries[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r.values[s.key] ?? 0)));
  const minWidth = Math.max(rows.length * (series.length * 7 + 6), 260);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs font-bold">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", s.className)} /> {s.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex h-48 items-end gap-1.5 border-b border-border" style={{ minWidth }}>
          {rows.map((r, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 items-end justify-center gap-px">
              {series.map((s) => {
                const v = r.values[s.key] ?? 0;
                return (
                  <div
                    key={s.key}
                    className={cn("w-full max-w-5 rounded-t-sm", s.className, v === 0 && "opacity-20")}
                    style={{ height: `${Math.max(v === 0 ? 1.5 : 4, (v / max) * 100)}%` }}
                    title={`${r.label} · ${s.label}: ${format(v)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5" style={{ minWidth }}>
          {rows.map((r, i) => (
            <span key={i} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground tabular">
              {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
