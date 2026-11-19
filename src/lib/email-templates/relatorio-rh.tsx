import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'

type Linha = { data: string; turma: string; horario: string; nome: string; turno: string; ocorrencia: string; dias: string }
interface Props { periodo?: string; linhas?: Linha[] }

const Email = ({ periodo = '', linhas = [] }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Ocorrências de funcionários – {periodo}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Trópico's – Ocorrências de funcionários</Heading>
        <Text style={p}>Período: {periodo} (todos os turnos)</Text>
        {linhas.length === 0 ? (
          <Text style={p}>Nenhuma ocorrência lançada neste período.</Text>
        ) : (
          <table style={tabela} cellPadding={6}>
            <thead>
              <tr>{['Data', 'Funcionário', 'Turno', 'Ocorrência', 'Dias', 'Boletim'].map((t) => <th key={t} style={th}>{t}</th>)}</tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td style={td}>{l.data}</td><td style={td}>{l.nome}</td><td style={td}>{l.turno}</td>
                  <td style={td}>{l.ocorrencia}</td><td style={td}>{l.dias}</td>
                  <td style={td}>Turma {l.turma} {l.horario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Section><Text style={small}>Total: {linhas.length} ocorrência(s). Enviado automaticamente pelo Boletim Diário.</Text></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Ocorrências de funcionários – ${d.periodo ?? ''}`,
  displayName: 'Relatório diário RH',
  previewData: { periodo: '18/11/2026 06h a 19/11/2026 06h', linhas: [{ data: '18/11/2026', turma: 'B', horario: '12:00 as 18:00', nome: 'Maria Silva', turno: 'A', ocorrencia: 'Falta', dias: '1' }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { color: '#c2410c', fontSize: '20px' }
const p = { fontSize: '14px', color: '#222' }
const small = { fontSize: '12px', color: '#666' }
const tabela = { borderCollapse: 'collapse' as const, width: '100%', fontSize: '13px' }
const th = { background: '#fed7aa', textAlign: 'left' as const, border: '1px solid #ddd' }
const td = { border: '1px solid #ddd' }
