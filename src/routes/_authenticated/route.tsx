import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sem internet não dá para revalidar; usa a sessão guardada no aparelho.
    if (!navigator.onLine) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/auth" });
      return { user: data.session.user };
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
