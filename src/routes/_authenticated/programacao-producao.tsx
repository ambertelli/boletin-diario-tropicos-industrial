import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { hojeISO, dataBR, calcularSaldos, fmt } from "@/lib/producao";
import { boletinsDiaQuery, espelhoQuery } from "@/lib/dados";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/programacao-producao")({
  validateSearch: (search: Record<string, unknown>): { data?: string } => {
    const d = search["data"];
    return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? { data: d } : {};
  },
  head: () => ({ meta: [{ title: "Programação de produção – Diário de Produção" }] }),
  component: ProgramacaoProducao,
});

const nomeLinha = (n: number) => `Embaladeira ${n}`;

function ProgramacaoProducao() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const date = search.data ?? hojeISO();
  const esp = useQuery(espelhoQuery(date));
  const bol = useQuery(boletinsDiaQuery(date));

  const prog = esp.data?.itens ?? [];
  const linhas = (bol.data ?? []).flatMap((b) => b.producao ?? []);
  const { itens, fora } = calcularSaldos(prog, linhas);
  const meta = new Map(prog.map((p) => [p.id, p]));
  const grupos = new Map<number, typeof itens>();
  for (const i of itens) {
    const e = meta.get(i.id)?.embaladeira ?? 0;
    grupos.set(e, [...(grupos.get(e) ?? []), i]);
  }
  const totProg = itens.reduce((a, i) => a + i.quantidade, 0);
  const totProd = itens.reduce((a, i) => a + i.produzido, 0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold">Programação de produção</h1>
        <p className="text-muted-foreground">{dataBR(date)} · espelho do app Programação Diária, debitado pelos boletins</p>
      </div>
      <div className="flex gap-2">
        <Input aria-label="Data da programação" type="date" className="w-44" value={date} onChange={(e) => navigate({ search: { data: e.target.value } })} />
        <Button variant="outline" onClick={() => { esp.refetch(); bol.refetch(); }}>Atualizar</Button>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Fardos programados" value={fmt(totProg)} />
      <Metric label="Produzido (boletins)" value={fmt(totProd)} />
      <Metric label="Saldo" value={fmt(totProg - totProd)} />
    </div>
    {esp.isLoading ? <p className="text-sm text-muted-foreground">Carregando programação…</p>
      : esp.data && !esp.data.ok ? <p className="rounded-md border border-destructive p-3 text-sm text-destructive">{esp.data.erro}</p>
      : esp.isError ? <p className="text-sm text-destructive">Sem conexão com o app Programação Diária.</p>
      : !itens.length ? <p className="text-sm text-muted-foreground">Nenhuma programação lançada no app Programação Diária para esta data.</p>
      : [...grupos.entries()].sort((a, b) => a[0] - b[0]).map(([emb, lista]) => (
        <section key={emb} className="overflow-hidden rounded-md border bg-card">
          <div className="sheet-title">{nomeLinha(emb)}</div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left"><th className="sheet-th">Prior.</th><th className="sheet-th">Produto</th><th className="sheet-th">Formato</th><th className="sheet-th">Metros</th><th className="sheet-th text-right">Programado</th><th className="sheet-th text-right">Produzido</th><th className="sheet-th text-right">Saldo</th><th className="sheet-th w-40">Progresso</th></tr></thead>
            <tbody>{lista.sort((a, b) => (meta.get(a.id)?.prioridade ?? 0) - (meta.get(b.id)?.prioridade ?? 0)).map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-2 py-1.5">{meta.get(i.id)?.prioridade}</td>
                <td className="px-2 font-medium">{i.marca}</td><td className="px-2">{i.formato}</td><td className="px-2">{i.metros}</td>
                <td className="px-2 text-right">{fmt(i.quantidade)}</td><td className="px-2 text-right">{fmt(i.produzido)}</td>
                <td className={`px-2 text-right font-semibold ${i.saldo <= 0 ? "text-success" : "text-primary"}`}>{fmt(i.saldo)}</td>
                <td className="px-2"><Progress value={i.quantidade ? Math.min(100, (i.produzido / i.quantidade) * 100) : 0} /></td>
              </tr>))}</tbody>
          </table></div>
        </section>))}
    {fora.length > 0 && <section className="overflow-hidden rounded-md border bg-card">
      <div className="sheet-title">Produção fora da programação (confira nomes nos Cadastros)</div>
      <table className="w-full text-sm"><tbody>{fora.map((f, k) => <tr key={k} className="border-t text-muted-foreground"><td className="px-2 py-1.5">{f.marca}</td><td className="px-2">{f.formato}</td><td className="px-2">{f.metros}</td><td className="px-2 text-right">{fmt(f.quantidade)}</td></tr>)}</tbody></table>
    </section>}
    <p className="text-xs text-muted-foreground">A programação é editada só no app Programação Diária. Produto, formato e metragem precisam ser iguais aos usados no boletim para debitar.</p>
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border bg-card p-4"><div className="text-sm font-semibold uppercase text-muted-foreground">{label}</div><div className="font-display text-3xl font-bold">{value}</div></div>; }
