import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'
import { EMAILS_RH, cicloQueFechou, noCiclo } from '@/lib/relatorio-rh'
import { somarDias } from '@/lib/producao'

const br = (iso: string) => iso.split('-').reverse().join('/')

export const Route = createFileRoute('/api/public/jobs/relatorio-rh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request)
        if (authFailure) return authFailure

        const inicio = cicloQueFechou(new Date())
        const fim = somarDias(inicio, 1)
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin.from('boletins')
          .select('data,turma,horario,ocorrencias').gte('data', inicio).lte('data', fim)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        const linhas = (data ?? []).filter((b) => noCiclo(b, inicio)).flatMap((b) =>
          ((b.ocorrencias as any[]) ?? []).filter((o) => o?.nome || o?.ocorrencia).map((o) => ({
            data: o.data || br(b.data), turma: b.turma, horario: b.horario,
            nome: o.nome ?? '', turno: o.turno ?? '', ocorrencia: o.ocorrencia ?? '', dias: String(o.dias ?? ''),
          })))
        const periodo = `${br(inicio)} 06h a ${br(fim)} 06h`

        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        const resultados: Record<string, string> = {}
        for (const para of EMAILS_RH) {
          try {
            const r = await sendTemplateEmail('relatorio-rh', para, {
              templateData: { periodo, linhas }, idempotencyKey: `relatorio-rh-${inicio}-${para}`,
            })
            resultados[para] = r.sent ? 'enviado' : r.reason
          } catch (e) { resultados[para] = e instanceof Error ? e.message : String(e) }
        }
        return Response.json({ periodo, total: linhas.length, resultados })
      },
    },
  },
})
