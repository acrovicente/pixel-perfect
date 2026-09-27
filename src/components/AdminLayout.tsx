import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Bot, Globe, LayoutDashboard, ListOrdered, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { to: "/acessos", label: "Acessos", icon: ListOrdered },
  { to: "/redes", label: "Redes bloqueadas", icon: Globe },
  { to: "/bots", label: "Bots conhecidos", icon: Bot },
] as const;

export function AdminLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Activity className="size-5 text-sidebar-primary" />
          <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">
            Access Monitor
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm bg-sidebar-accent text-sidebar-primary font-medium",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={signOut}>
          <LogOut className="size-4" /> Sair
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-8">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex gap-2 md:hidden">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-md p-2 text-muted-foreground">
                <item.icon className="size-4" />
              </Link>
            ))}
            <button onClick={signOut} className="rounded-md p-2 text-muted-foreground">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
