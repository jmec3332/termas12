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
          <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end">
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
          <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground tabular">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
