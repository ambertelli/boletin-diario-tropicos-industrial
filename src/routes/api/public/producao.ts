import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { dataCiclo, somarDias } from '@/lib/producao'

const Q = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/** Produção dos boletins (ciclos 12h-12h de `inicio` até antes de `fim`) para o app Programação Diária. */
export const Route = createFileRoute('/api/public/producao')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env['PLANNER_SYNC_SECRET']
        if (!secret || request.headers.get('x-sync-secret') !== secret) return new Response('Unauthorized', { status: 401 })
        const url = new URL(request.url)
        const p = Q.safeParse({ inicio: url.searchParams.get('inicio') ?? url.searchParams.get('data'), fim: url.searchParams.get('fim') ?? undefined })
        if (!p.success) return Response.json({ error: 'parâmetros inválidos' }, { status: 400 })
        const inicio = p.data.inicio
        const fim = p.data.fim ?? somarDias(inicio, 1)
        if (fim <= inicio || fim > somarDias(inicio, 31)) return Response.json({ error: 'intervalo inválido' }, { status: 400 })
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin.from('boletins').select('data,horario,producao').gte('data', inicio).lte('data', fim)
        if (error) return Response.json({ error: error.message }, { status: 500 })
        const mapa = new Map<string, { marca: string; formato: string; metros: string; quantidade: number }>()
        let boletins = 0
        for (const b of data ?? []) {
          const c = dataCiclo(b.data, b.horario)
          if (c < inicio || c >= fim) continue
          boletins++
          for (const l of ((b.producao as any[]) ?? [])) {
            if (!l?.marca && !l?.formato) continue
            const marca = String(l.marca ?? '').trim(), formato = String(l.formato ?? '').trim(), metros = String(l.metros ?? '').trim()
            const k = [marca, formato, metros].map((s) => s.toLowerCase()).join('|')
            const atual = mapa.get(k) ?? { marca, formato, metros, quantidade: 0 }
            atual.quantidade += Number(l.quantidade) || 0
            mapa.set(k, atual)
          }
        }
        return Response.json({ inicio, fim, boletins, itens: [...mapa.values()] })
      },
    },
  },
})
