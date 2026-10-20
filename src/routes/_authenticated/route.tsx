import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { semInternet, sessaoGuardada } from "@/lib/sessao";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sem internet não dá para revalidar nem renovar; usa a sessão guardada no aparelho, mesmo vencida.
    const offline = () => {
      const s = sessaoGuardada();
      if (!s) throw redirect({ to: "/auth" });
      return { user: s.user };
    };
    if (semInternet()) return offline();
    const { data, error } = await supabase.auth.getUser();
    if (!data.user) {
      // Rede caiu no meio da verificação: não expulsa o líder.
      if (error && (error.name === "AuthRetryableFetchError" || error.status === 0)) return offline();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
