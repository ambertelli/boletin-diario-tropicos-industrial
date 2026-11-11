import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { boletinsCicloQuery, boletinsDiaQuery, boletinsMesQuery, espelhoQuery, programacaoQuery } from "@/lib/dados";
import { HORARIOS, dataBR, dataCiclo, fmt, hojeISO, somarDias, totalBoletim } from "@/lib/producao";
import { SaldoTabela } from "@/components/SaldoTabela";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel do dia – Diário de Produção" }] }),
  component: Painel,
});

function cicloInicial(data: string) {
  return data === hojeISO() && new Date().getHours() < 12 ? somarDias(data, -1) : data;
}

function Painel() {
  const [data, setDataState] = useState(hojeISO());
  const [ciclo, setCiclo] = useState(() => cicloInicial(hojeISO()));
  const setData = (d: string) => { setDataState(d); setCiclo(cicloInicial(d)); };
  const ontem = somarDias(data, -1);
  const prog = useQuery(programacaoQuery(ciclo));
  const esp = useQuery(espelhoQuery(ciclo));
  const dia = useQuery(boletinsDiaQuery(data));
  const cic = useQuery(boletinsCicloQuery(ciclo));
  const mes = useQuery(boletinsMesQuery(data));
  const linhasDia = (dia.data ?? []).flatMap((b) => b.producao);
  const totalDia = totalBoletim(linhasDia);
  const totalMes = (mes.data ?? []).filter((b) => b.data <= data).reduce((a, b) => a + totalBoletim(b.producao), 0);
  const totalCiclo = (cic.data ?? []).reduce((a, b) => a + totalBoletim(b.producao), 0);
  const linhasCiclo = (cic.data ?? []).flatMap((b) => b.producao).filter((l) => l.secao !== "segunda");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Painel do dia</h1>
          <p className="text-muted-foreground">{dataBR(data)}</p>
        </div>
        <Input type="date" className="w-44" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Acumulado do dia" valor={fmt(totalDia)} />
        <Kpi label={`Acumulado do ciclo ${dataBR(ciclo).slice(0, 5)} (12h às 12h)`} valor={fmt(totalCiclo)} />
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
                <div className="text-xs font-semibold text-primary">Programação de {dataBR(dataCiclo(data, h))}</div>
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
        <div className="sheet-title">Programação de {dataBR(ciclo)} × Produção</div>
        <div className="flex flex-wrap gap-2 border-b p-2">
          {[ontem, data].map((c) => (
            <Button key={c} size="sm" variant={c === ciclo ? "default" : "outline"} onClick={() => setCiclo(c)}>
              Programação de {dataBR(c)}
            </Button>
          ))}
        </div>
        <SaldoTabela programacao={prog.data ?? []} linhas={linhasCiclo} observacoes={esp.data?.observacoes ?? []} />
        <div className="border-t p-2 text-right">
          <Link to="/programacao-producao" search={{ data: ciclo }} className="text-sm underline">Ver programação</Link>
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
