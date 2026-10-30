import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { itemEspelhoParaProgramacao, type ItemEspelho } from "./espelho";

const PLANNER_URL = "https://rollomatic-planner.lovable.app";

/** Busca a programação do app Programação Diária para a data (só líderes logados). */
export const buscarProgramacaoEspelho = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["PLANNER_SYNC_SECRET"];
    if (!secret) return { ok: false as const, erro: "Integração ainda não configurada.", itens: [] as ReturnType<typeof itemEspelhoParaProgramacao>[] };
    try {
      const r = await fetch(`${PLANNER_URL}/api/public/programacao?data=${data.data}`, { headers: { "x-sync-secret": secret } });
      if (!r.ok) {
        console.error("planner", r.status, await r.text());
        return { ok: false as const, erro: r.status === 401 ? "Senha da integração não confere." : "App Programação Diária indisponível.", itens: [] };
      }
      const body = (await r.json()) as { itens: ItemEspelho[] };
      return { ok: true as const, erro: null, itens: (body.itens ?? []).map(itemEspelhoParaProgramacao) };
    } catch (e) {
      console.error(e);
      return { ok: false as const, erro: "Não foi possível falar com o app Programação Diária.", itens: [] };
    }
  });
