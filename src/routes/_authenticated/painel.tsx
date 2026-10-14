import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { boletinsDiaQuery, boletinsMesQuery, programacaoQuery } from "@/lib/dados";
import { HORARIOS, dataBR, fmt, hojeISO, totalBoletim } from "@/lib/producao";
import { SaldoTabela } from "@/components/SaldoTabela";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel do dia – Diário de Produção" }] }),
  component: Painel,
});

function Painel() {
  const [data, setData] = useState(hojeISO());
  const prog = useQuery(programacaoQuery(data));
  const dia = useQuery(boletinsDiaQuery(data));
  const mes = useQuery(boletinsMesQuery(data));
  const linhasDia = (dia.data ?? []).flatMap((b) => b.producao);
  const totalDia = totalBoletim(linhasDia);
  const totalMes = (mes.data ?? []).filter((b) => b.data <= data).reduce((a, b) => a + totalBoletim(b.producao), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel do dia</h1>
          <p className="text-muted-foreground">{dataBR(data)}</p>
        </div>
        <Input type="date" className="w-44" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Acumulado do dia" valor={fmt(totalDia)} />
        <Kpi label="Acumulado do mês" valor={fmt(totalMes)} destaque />
      </div>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="sheet-title">Turnos</div>
        <div className="grid sm:grid-cols-4">
          {HORARIOS.map((h) => {
            const b = dia.data?.find((x) => x.horario === h);
            return (
              <div key={h} className="border-b p-4 sm:border-b-0 sm:border-r last:border-r-0">
                <div className="font-display text-lg font-semibold">{h}</div>
                {b ? (
                  <>
                    <div className="text-sm">Turma <b>{b.turma}</b> · {b.lider || "—"}</div>
                    <div className="mt-1 text-2xl font-bold text-primary">{fmt(totalBoletim(b.producao))}</div>
                    <Link to="/boletim/$id" params={{ id: b.id }} className="text-sm underline">Abrir boletim</Link>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground">Pendente</div>
                    <Button asChild size="sm" className="mt-2">
                      <Link to="/boletim/novo" search={{ data, horario: h }}>Lançar</Link>
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="sheet-title">Programação diária × Produção</div>
        <SaldoTabela programacao={prog.data ?? []} linhas={linhasDia} />
        <div className="border-t p-2 text-right">
          <Link to="/programacao" search={{ data }} className="text-sm underline">Editar programação</Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-sm font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl font-bold ${destaque ? "text-destructive" : ""}`}>{valor}</div>
    </div>
  );
}
