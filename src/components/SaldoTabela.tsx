import { calcularSaldos, fmt, type ItemProgramacao, type LinhaProducao } from "@/lib/producao";
import { Progress } from "@/components/ui/progress";

export function SaldoTabela({ programacao, linhas }: { programacao: ItemProgramacao[]; linhas: LinhaProducao[] }) {
  const { itens, fora } = calcularSaldos(programacao, linhas);
  if (!itens.length && !fora.length)
    return <p className="p-4 text-sm text-muted-foreground">Nenhuma programação para este dia.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left">
          <th className="sheet-th">Marca</th><th className="sheet-th">Formato</th><th className="sheet-th">Metros</th>
          <th className="sheet-th text-right">Programado</th><th className="sheet-th text-right">Produzido</th>
          <th className="sheet-th text-right">Saldo</th><th className="sheet-th w-40">Progresso</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((i) => (
          <tr key={i.id} className="border-t">
            <td className="px-2 py-1.5 font-medium">{i.marca}</td><td className="px-2">{i.formato}</td><td className="px-2">{i.metros}</td>
            <td className="px-2 text-right">{fmt(i.quantidade)}</td>
            <td className="px-2 text-right">{fmt(i.produzido)}</td>
            <td className={`px-2 text-right font-semibold ${i.saldo <= 0 ? "text-success" : "text-primary"}`}>{fmt(i.saldo)}</td>
            <td className="px-2"><Progress value={i.quantidade ? Math.min(100, (i.produzido / i.quantidade) * 100) : 0} /></td>
          </tr>
        ))}
        {fora.map((f, k) => (
          <tr key={"f" + k} className="border-t bg-muted/50 text-muted-foreground">
            <td className="px-2 py-1.5">{f.marca}</td><td className="px-2">{f.formato}</td><td className="px-2">{f.metros}</td>
            <td className="px-2 text-right">—</td><td className="px-2 text-right">{fmt(f.quantidade)}</td>
            <td className="px-2 text-right text-xs" colSpan={2}>fora da programação</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
