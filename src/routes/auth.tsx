import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { erroDeRedeAuth, sessaoGuardada } from "@/lib/sessao";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar – Diário de Produção Trópico's" },
      { name: "description", content: "Acesso dos líderes de turno ao boletim de conversão." },
      { property: "og:title", content: "Entrar – Diário de Produção Trópico's" },
      { property: "og:description", content: "Acesso dos líderes de turno ao boletim de conversão." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const atualizar = () => {
      setOnline(navigator.onLine);
      // Sem internet, quem já entrou neste aparelho vai direto para o painel.
      if (!navigator.onLine && sessaoGuardada()) navigate({ to: "/painel" });
    };
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => { window.removeEventListener("online", atualizar); window.removeEventListener("offline", atualizar); };
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/painel" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error("Sem internet. O primeiro acesso neste aparelho precisa de conexão.");
      return;
    }
    setBusy(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) toast.error(erroDeRedeAuth(error) ? "Sem conexão com o servidor. Tente de novo quando a internet voltar." : "E-mail ou senha inválidos");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password: senha, options: { emailRedirectTo: window.location.origin + "/painel" },
      });
      if (error) toast.error(erroDeRedeAuth(error) ? "Sem conexão com o servidor. Tente de novo quando a internet voltar." : error.message);
      else if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
        <h1 className="font-display text-3xl font-bold text-primary">TRÓPICO'S</h1>
        <p className="mb-6 text-sm text-muted-foreground">Diário de Produção · Boletim Conversão</p>
        {!online && (
          <p className="mb-4 rounded bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground">
            Sem internet. O primeiro acesso neste aparelho precisa de conexão.
          </p>
        )}
        <form onSubmit={enviar} className="space-y-3">
          <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <Button className="w-full" disabled={busy || !online}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google} disabled={!online}>Continuar com Google</Button>
        <button className="mt-4 w-full text-sm text-muted-foreground underline" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
          {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
