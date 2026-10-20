import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { erroDeRede, sincronizar, type Operacao } from "./fila";

async function executar(op: Operacao) {
  try {
    const r = op.tipo === "salvar"
      ? await supabase.from("boletins").upsert({ id: op.id, ...op.payload } as never)
      : await supabase.from("boletins").delete().eq("id", op.id);
    if (!r.error) return { ok: true as const };
    return {
      ok: false as const,
      rede: erroDeRede(r.error),
      mensagem: r.error.code === "23505" ? "Já existe boletim para este dia e horário" : r.error.message,
    };
  } catch (e) {
    return { ok: false as const, rede: true, mensagem: String(e) };
  }
}

export async function sincronizarAgora(qc: QueryClient) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  // Acesso vencido enquanto estava sem internet: renova antes de enviar.
  const { data } = await supabase.auth.getSession();
  if (!data.session || (data.session.expires_at ?? 0) * 1000 < Date.now() + 30_000) {
    const r = await supabase.auth.refreshSession();
    if (r.error || !r.data.session) return;
  }
  const n = await sincronizar(executar, (op, msg) => toast.error(`Boletim pendente não enviado: ${msg}`, { duration: 10000 }));
  if (n > 0) {
    toast.success(`${n} boletim(ns) sincronizado(s)`);
    qc.invalidateQueries();
  }
}
