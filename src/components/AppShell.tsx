import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusConexao } from "@/components/StatusConexao";

const links = [
  { to: "/painel", label: "Painel do dia" },
  { to: "/boletim/novo", label: "Novo boletim" },
  { to: "/programacao", label: "Programação diária" },
  { to: "/historico", label: "Histórico" },
  { to: "/cadastros", label: "Cadastros" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen">
      <header className="no-print bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/painel" className="font-display text-xl font-bold tracking-wide">
            <span className="text-sidebar-primary">TRÓPICO'S</span> · Diário de Produção
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded px-3 py-1.5 text-sm font-medium hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Button size="sm" variant="secondary" onClick={sair}>Sair</Button>
        </div>
      </header>
      <StatusConexao />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
