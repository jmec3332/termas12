import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="wood-grain border-b bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {eyebrow && <p className="text-xs font-black uppercase tracking-[0.18em] text-moss">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-black md:text-4xl">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground md:px-6" role="status">
      Cargando…
    </div>
  );
}
