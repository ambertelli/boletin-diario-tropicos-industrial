import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { itemEspelhoParaProgramacao, lerObservacoes, type ItemEspelho, type Observacao } from "./espelho";

const PLANNER_URL = "https://rollomatic-planner.lovable.app";

/** Busca a programação do app Programação Diária para a data (só líderes logados). */
export const buscarProgramacaoEspelho = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["PLANNER_SYNC_SECRET"];
    if (!secret) return { ok: false as const, erro: "Integração ainda não configurada.", itens: [] as ReturnType<typeof itemEspelhoParaProgramacao>[], observacoes: [] as Observacao[] };
    try {
      const r = await fetch(`${PLANNER_URL}/api/public/programacao?data=${data.data}`, { headers: { "x-sync-secret": secret } });
      if (!r.ok) {
        console.error("planner", r.status, await r.text());
        return { ok: false as const, erro: r.status === 401 ? "Senha da integração não confere." : "App Programação Diária indisponível.", itens: [], observacoes: [] };
      }
      const body = (await r.json()) as { itens: ItemEspelho[]; observacoes?: unknown; notes?: unknown };
      return { ok: true as const, erro: null, itens: (body.itens ?? []).map(itemEspelhoParaProgramacao), observacoes: lerObservacoes(body.observacoes ?? body.notes) };
    } catch (e) {
      console.error(e);
      return { ok: false as const, erro: "Não foi possível falar com o app Programação Diária.", itens: [], observacoes: [] };
    }
  });

/** Vigência da programação que contém `data`: dias vizinhos com os mesmos itens formam um só ciclo (ex.: 12 a 14/11 = 48h). */
export const buscarVigencia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["PLANNER_SYNC_SECRET"];
    const um = { inicio: data.data, fim: somar(data.data, 1) };
    if (!secret) return um;
    const assinatura = async (d: string) => {
      const r = await fetch(`${PLANNER_URL}/api/public/programacao?data=${d}`, { headers: { "x-sync-secret": secret } });
      if (!r.ok) return "";
      const b = (await r.json()) as { itens?: { id: string }[] };
      return (b.itens ?? []).map((i) => i.id).sort().join(",");
    };
    try {
      const base = await assinatura(data.data);
      if (!base) return um;
      let inicio = data.data, fim = data.data;
      for (let k = 0; k < 10 && (await assinatura(somar(inicio, -1))) === base; k++) inicio = somar(inicio, -1);
      for (let k = 0; k < 10 && (await assinatura(somar(fim, 1))) === base; k++) fim = somar(fim, 1);
      return { inicio, fim: somar(fim, 1) };
    } catch (e) {
      console.error(e);
      return um;
    }
  });

function somar(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
