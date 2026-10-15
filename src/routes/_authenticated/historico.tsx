import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { boletinsMesQuery } from "@/lib/dados";
import { dataBR, fmt, hojeISO, totalBoletim } from "@/lib/producao";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico – Diário de Produção" }] }),
  component: Historico,
});

function Historico() {
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [turma, setTurma] = useState("");
  const q = useQuery(boletinsMesQuery(mes + "-01"));
  const lista = (q.data ?? []).filter((b) => !turma || b.turma === turma);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Histórico de boletins</h1>
        <div className="flex gap-2">
          <select className="rounded-md border bg-card px-2" value={turma} onChange={(e) => setTurma(e.target.value)}>
            <option value="">Todas as turmas</option>{["A", "B", "C", "D"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input type="month" className="w-44" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="text-left"><th className="sheet-th">Data</th><th className="sheet-th">Horário</th><th className="sheet-th">Turma</th><th className="sheet-th">Líder</th><th className="sheet-th text-right">Total</th></tr></thead>
          <tbody>
            {lista.map((b) => (
              <tr key={b.id} className="border-t hover:bg-accent">
                <td className="px-2 py-2"><Link to="/boletim/$id" params={{ id: b.id }} className="font-medium underline">{dataBR(b.data)}</Link></td>
                <td className="px-2">{b.horario}</td><td className="px-2 font-bold">{b.turma}</td><td className="px-2">{b.lider}</td>
                <td className="px-2 text-right font-semibold">{fmt(totalBoletim(b.producao))}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={5} className="p-4 text-muted-foreground">Nenhum boletim neste mês.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
