import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha – Diário de Produção Trópico's" },
      { name: "description", content: "Defina uma nova senha de acesso ao boletim." },
      { property: "og:title", content: "Nova senha – Diário de Produção Trópico's" },
      { property: "og:description", content: "Defina uma nova senha de acesso ao boletim." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== conf) { toast.error("As senhas não são iguais."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) toast.error("Link vencido ou inválido. Peça outro em Esqueci a senha.");
    else { toast.success("Senha trocada!"); navigate({ to: "/painel" }); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="dark w-full max-w-sm rounded-lg border border-sidebar-border bg-sidebar-accent p-6 text-sidebar-foreground shadow-xl">
        <h1 className="mb-4 font-display text-2xl font-bold">Nova senha</h1>
        <form onSubmit={salvar} className="space-y-3">
          <div><Label>Nova senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <div><Label>Repita a senha</Label><Input type="password" required minLength={6} value={conf} onChange={(e) => setConf(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>Salvar nova senha</Button>
        </form>
      </div>
    </div>
  );
}
