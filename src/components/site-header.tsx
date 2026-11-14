import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/reservar", label: "Reservar" },
  { to: "/mi-visita", label: "Mi visita" },
  { to: "/graficos", label: "Gráficos" },
  { to: "/admin", label: "Administración" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-3">
        <Link to="/" className="flex items-center gap-2">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent font-display text-sm font-black text-accent-foreground">
            P
          </span>
          <span className="font-display text-lg font-bold leading-none">Termas Punulaf</span>
        </Link>
        <nav aria-label="Principal" className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
          <ul className="flex w-max gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="block rounded-full px-3 py-1.5 text-sm font-bold text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
