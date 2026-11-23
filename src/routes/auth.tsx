import logoAsset from "@/assets/logo-tropicos-transparente.png.asset.json";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

  async function esqueci() {
    if (!email) { toast.error("Digite seu e-mail acima e clique de novo em Esqueci a senha."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    if (error) toast.error("Não foi possível enviar. Tente de novo.");
    else toast.success("Enviamos um link para trocar a senha no seu e-mail.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 p-6 text-white shadow-xl" style={{ backgroundColor: "#00344e" }}>
        <h1><img src={logoAsset.url} alt="Trópico's" className="mb-2 w-full" /></h1>
        <p className="mb-6 text-sm text-white/80">Diário de Produção · Boletim Conversão</p>
        {!online && (
          <p className="mb-4 rounded bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground">
            Sem internet. O primeiro acesso neste aparelho precisa de conexão.
          </p>
        )}
        <form onSubmit={enviar} className="space-y-3">
          <div><Label>E-mail</Label><Input className="bg-white text-slate-900" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Senha</Label><Input className="bg-white text-slate-900" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <Button className="w-full" disabled={busy || !online}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Button>
        </form>
        {modo === "entrar" && <button type="button" className="mt-3 w-full text-sm text-white underline" onClick={esqueci} disabled={!online}>Esqueci a senha</button>}
        <button className="mt-3 w-full text-sm text-white underline" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
          {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
