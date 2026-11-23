import { AlertTriangle } from "lucide-react";
import { calcularSaldos, fmt, fmtSaldo, type ItemProgramacao, type LinhaProducao, type Saldo } from "@/lib/producao";
import { ProgressoStatus, corSaldo } from "@/components/ProgressoStatus";
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
          <td className="px-2 py-1.5">{obsDe.get(norm(i.marca))?.length
            ? <span className="inline-block rounded-md border-2 border-warning-foreground/30 bg-warning px-2 py-0.5 font-bold uppercase text-warning-foreground"><AlertTriangle className="mr-1 inline h-4 w-4 align-[-2px] text-destructive" />{obsDe.get(norm(i.marca))!.join(" · ")}</span>
            : <span className="text-muted-foreground">—</span>}</td>
          <td className="px-2 text-right">{fmt(i.quantidade)}</td>
          <td className="px-2 text-right">{fmt(i.produzido)}</td>
          <td className={`px-2 text-right font-semibold ${corSaldo(i.saldo)}`}>{fmtSaldo(i.saldo)}</td>
          <td className="px-2"><ProgressoStatus programado={i.quantidade} produzido={i.produzido} /></td>
        </tr>
      ))}
    </tbody>
  );

  const cartoes = (titulo: string, lista: Saldo[]) => lista.length > 0 && (
    <div key={titulo}>
      <div className="sheet-th bg-muted text-center text-xs font-bold uppercase">{titulo}</div>
      {lista.map((i) => {
        const obs = obsDe.get(norm(i.marca));
        return (
          <div key={i.id} className="space-y-2 border-t p-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i.prioridadeFabricacao ?? "—"}</span>
              <span className="min-w-0 break-words font-semibold">{i.marca}</span>
            </div>
            {obs?.length ? <div className="rounded-md border-2 border-warning-foreground/30 bg-warning px-2 py-1 text-xs font-bold uppercase text-warning-foreground"><AlertTriangle className="mr-1 inline h-4 w-4 align-[-3px] text-destructive" />{obs.join(" · ")}</div> : null}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-[11px] text-muted-foreground">Programado</div><div className="font-semibold">{fmt(i.quantidade)}</div></div>
              <div><div className="text-[11px] text-muted-foreground">Produzido</div><div className="font-semibold">{fmt(i.produzido)}</div></div>
              <div><div className="text-[11px] text-muted-foreground">Saldo</div><div className={`font-bold ${corSaldo(i.saldo)}`}>{fmtSaldo(i.saldo)}</div></div>
            </div>
            <ProgressoStatus programado={i.quantidade} produzido={i.produzido} />
          </div>
        );
      })}
    </div>
  );

  return (
    <>
    <div className="text-sm md:hidden">
      {cartoes(BLOCOS[0]!.titulo, itens.filter((i) => BLOCOS[0]!.ok(linhaDe.get(i.id) ?? 0)))}
      <div className={`sheet-th text-center text-xs font-bold uppercase ${obsAvulsas.length ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-muted"}`}>{obsAvulsas.length ? <><AlertTriangle className="mr-1 inline h-4 w-4 align-[-3px]" />Atenção urgente — </> : ""}Programação anterior e observações</div>
      {obsAvulsas.length === 0
        ? <p className="border-t p-3 text-muted-foreground">Nenhuma observação.</p>
        : obsAvulsas.map((o, k) => (
          <div key={"mo" + k} className="border-2 border-destructive bg-destructive/10 p-3 font-bold text-destructive">
            <div>{o.marca || "—"}</div><div className="font-semibold">{o.obs}</div>
          </div>
        ))}
      {BLOCOS.slice(1).map((b) => cartoes(b.titulo, itens.filter((i) => b.ok(linhaDe.get(i.id) ?? 0))))}
      {fora.length > 0 && (
        <div>
          <div className="sheet-th bg-muted text-center text-xs font-bold uppercase">Fora da programação</div>
          {fora.map((f, k) => (
            <div key={"mf" + k} className="flex justify-between gap-2 border-t bg-muted/50 p-3 text-muted-foreground">
              <span className="min-w-0 break-words">{f.marca}</span><span className="shrink-0">Produzido: <b>{fmt(f.quantidade)}</b></span>
            </div>
          ))}
        </div>
      )}
    </div>
    <table className="hidden w-full text-sm md:table">
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
        <tr><td colSpan={7} className={`sheet-th text-center font-bold uppercase ${obsAvulsas.length ? "animate-pulse bg-destructive text-base text-destructive-foreground" : "bg-muted"}`}>{obsAvulsas.length ? <><AlertTriangle className="mr-1 inline h-5 w-5 align-[-3px]" />Atenção urgente — </> : ""}Programação anterior e observações</td></tr>
        <tr className="border-t text-left"><td className="px-2 py-1 font-semibold" colSpan={2}>Marca / formato</td><td className="px-2 py-1 font-semibold" colSpan={5}>Observação</td></tr>
        {obsAvulsas.length === 0
          ? <tr className="border-t"><td colSpan={7} className="px-2 py-1.5 text-muted-foreground">Nenhuma observação.</td></tr>
          : obsAvulsas.map((o, k) => (
            <tr key={"o" + k} className="border-2 border-destructive bg-destructive/10 font-bold text-destructive">
              <td className="px-2 py-1.5" colSpan={2}>{o.marca || "—"}</td>
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
    </>
  );
}
