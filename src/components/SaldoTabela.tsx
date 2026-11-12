import { calcularSaldos, fmt, fmtSaldo, type ItemProgramacao, type LinhaProducao, type Saldo } from "@/lib/producao";
import { Progress } from "@/components/ui/progress";
import { ordenarPorPrioridade, type Observacao } from "@/lib/espelho";

type ItemComLinha = ItemProgramacao & { embaladeira?: number };

const BLOCOS = [
  { titulo: "1 - Papel Higiênico (Linhas 1 a 4)", ok: (e: number) => e >= 1 && e <= 4 },
  { titulo: "2 - Papel Institucional (Linhas 5 a 8)", ok: (e: number) => e >= 5 && e <= 8 },
  { titulo: "Outros itens programados", ok: (e: number) => !(e >= 1 && e <= 8) },
];

export function SaldoTabela({ programacao, linhas, observacoes = [] }: { programacao: ItemComLinha[]; linhas: LinhaProducao[]; observacoes?: Observacao[] }) {
  const validos = programacao.filter((p) => p.marca);
  const r = calcularSaldos(validos, linhas);
  const linhaDe = new Map(validos.map((p) => [p.id, Number(p.embaladeira) || 0]));
  const itens = ordenarPorPrioridade(r.itens);
  const fora = r.fora;
  if (!itens.length && !fora.length)
    return <p className="p-4 text-sm text-muted-foreground">Nenhuma programação para este dia.</p>;

  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  const obsDe = new Map<string, string[]>();
  for (const o of observacoes) if (o.marca && o.obs) obsDe.set(norm(o.marca), [...(obsDe.get(norm(o.marca)) ?? []), o.obs]);
  const programadas = new Set(itens.map((i) => norm(i.marca)));
  const obsAvulsas = observacoes.filter((o) => !o.marca || !programadas.has(norm(o.marca)));
  const bloco = (titulo: string, lista: Saldo[]) => lista.length > 0 && (
    <tbody key={titulo}>
      <tr><td colSpan={7} className="sheet-th bg-muted text-center font-bold uppercase">{titulo}</td></tr>
      {lista.map((i) => (
        <tr key={i.id} className="border-t">
          <td className="px-2 py-1.5 text-center font-semibold">{i.prioridadeFabricacao ?? "—"}</td>
          <td className="px-2 py-1.5 font-medium">{i.marca}</td>
          <td className="px-2 py-1.5 font-semibold text-primary">{obsDe.get(norm(i.marca))?.join(" · ") || "—"}</td>
          <td className="px-2 text-right">{fmt(i.quantidade)}</td>
          <td className="px-2 text-right">{fmt(i.produzido)}</td>
          <td className={`px-2 text-right font-semibold ${i.saldo <= 0 ? "text-success" : "text-primary"}`}>{fmtSaldo(i.saldo)}</td>
          <td className="px-2"><Progress value={i.quantidade ? Math.min(100, (i.produzido / i.quantidade) * 100) : 0} /></td>
        </tr>
      ))}
    </tbody>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left">
          <th className="sheet-th w-20 text-center">Prioridade</th>
          <th className="sheet-th">Marca</th>
          <th className="sheet-th">Observação</th>
          <th className="sheet-th text-right">Programado</th><th className="sheet-th text-right">Produzido</th>
          <th className="sheet-th text-right">Saldo</th><th className="sheet-th w-40">Progresso</th>
        </tr>
      </thead>
      {bloco(BLOCOS[0]!.titulo, itens.filter((i) => BLOCOS[0]!.ok(linhaDe.get(i.id) ?? 0)))}
      <tbody>
        <tr><td colSpan={7} className="sheet-th bg-muted text-center font-bold uppercase">Programação anterior e observações</td></tr>
        <tr className="border-t text-left"><td className="px-2 py-1 font-semibold" colSpan={2}>Marca / formato</td><td className="px-2 py-1 font-semibold" colSpan={5}>Observação</td></tr>
        {obsAvulsas.length === 0
          ? <tr className="border-t"><td colSpan={7} className="px-2 py-1.5 text-muted-foreground">Nenhuma observação.</td></tr>
          : obsAvulsas.map((o, k) => (
            <tr key={"o" + k} className="border-t">
              <td className="px-2 py-1.5 font-medium" colSpan={2}>{o.marca || "—"}</td>
              <td className="px-2 py-1.5" colSpan={5}>{o.obs}</td>
            </tr>
          ))}
      </tbody>
      {BLOCOS.slice(1).map((b) => bloco(b.titulo, itens.filter((i) => b.ok(linhaDe.get(i.id) ?? 0))))}
      {fora.length > 0 && (
        <tbody>
          <tr><td colSpan={7} className="sheet-th bg-muted text-center font-bold uppercase">Fora da programação</td></tr>
          {fora.map((f, k) => (
            <tr key={"f" + k} className="border-t bg-muted/50 text-muted-foreground">
              <td className="px-2 text-center">—</td>
              <td className="px-2 py-1.5">{f.marca}</td>
              <td className="px-2">—</td>
              <td className="px-2 text-right">—</td><td className="px-2 text-right">{fmt(f.quantidade)}</td>
              <td className="px-2" colSpan={2} />
            </tr>
          ))}
        </tbody>
      )}
    </table>
  );
}
