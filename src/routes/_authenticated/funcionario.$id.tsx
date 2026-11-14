import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TURMAS } from "@/lib/producao";
import { calcularFicha, diasLancamento, TIPOS_LANC, type Lancamento } from "@/lib/ficha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/funcionario/$id")({
  head: () => ({ meta: [{ title: "Ficha do funcionário – Diário de Produção" }, { name: "description", content: "Histórico de férias e faltas." }] }),
  component: Ficha,
});

const br = (d: string) => d.split("-").reverse().join("/");

function Ficha() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fq = useQuery({ queryKey: ["funcionario", id], queryFn: async () => (await supabase.from("funcionarios").select("*").eq("id", id).single()).data });
  const lq = useQuery({
    queryKey: ["lancamentos", id],
    queryFn: async () => ((await supabase.from("funcionario_lancamentos").select("*").eq("funcionario_id", id)).data ?? []) as Lancamento[],
  });
  const [n, setN] = useState({ data: "", tipo: "E", periodo: "", dias: "", descricao: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["lancamentos", id] });
  const f = fq.data;
  if (!f) return <p className="text-muted-foreground">Carregando…</p>;
  const linhas = calcularFicha(lq.data ?? []);
  const ult = linhas.at(-1);

  async function salvarFunc(campo: string, valor: string) {
    const { error } = await supabase.from("funcionarios").update({ [campo]: valor || null } as never).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["funcionario", id] });
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!n.data) { toast.error("Informe a data"); return; }
    const { error } = await supabase.from("funcionario_lancamentos").insert({ funcionario_id: id, ...n, dias: diasLancamento(n.tipo, n.dias) });
    if (error) { toast.error(error.message); return; }
    setN({ ...n, periodo: "", dias: "", descricao: "" }); refresh();
  }
  async function excluirFunc() {
    if (!confirm("Excluir funcionário e todo o histórico?")) return;
    await supabase.from("funcionarios").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["funcionarios"] });
    navigate({ to: "/funcionarios" });
  }

  return (
    <div className="space-y-4">
      <Link to="/funcionarios" className="text-sm text-muted-foreground underline">← Funcionários</Link>
      <div className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-4">
        <label className="text-xs">Funcionário<Input defaultValue={f.nome} onBlur={(e) => salvarFunc("nome", e.target.value)} /></label>
        <label className="text-xs">Função<Input defaultValue={f.funcao} onBlur={(e) => salvarFunc("funcao", e.target.value)} /></label>
        <label className="text-xs">Turma
          <select className="block h-9 w-full rounded-md border bg-background px-2" defaultValue={f.turma} onChange={(e) => salvarFunc("turma", e.target.value)}>
            {TURMAS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs">Vencimento de férias<Input type="date" defaultValue={f.vencimento_ferias ?? ""} onBlur={(e) => salvarFunc("vencimento_ferias", e.target.value)} /></label>
      </div>
      <div className="flex gap-4 text-lg font-bold">
        <span>Saldo férias: {ult?.saldo ?? 0} dias</span><span>Faltas acumuladas: {ult?.acumFaltas ?? 0}</span>
      </div>
      <form onSubmit={add} className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-[10rem_11rem_1fr_6rem_2fr_auto]">
        <Input type="date" value={n.data} onChange={(e) => setN({ ...n, data: e.target.value })} />
        <select className="rounded-md border bg-background px-2" value={n.tipo} onChange={(e) => setN({ ...n, tipo: e.target.value })}>
          {TIPOS_LANC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Input placeholder="Período (ex: 01/12 a 20/12)" value={n.periodo} onChange={(e) => setN({ ...n, periodo: e.target.value })} />
        <Input placeholder="Dias" type="number" value={n.dias} onChange={(e) => setN({ ...n, dias: e.target.value })} />
        <Input placeholder="Descrição" value={n.descricao} onChange={(e) => setN({ ...n, descricao: e.target.value })} />
        <Button>+ Lançar</Button>
      </form>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead><tr>{["Data do registro", "Tipo", "Período", "Qtde dias", "Saldo", "Faltas", "Acum. faltas", "Descrição", ""].map((h) => <th key={h} className="sheet-th">{h}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1">{br(l.data)}</td><td className="px-2">{l.tipo}</td><td className="px-2">{l.periodo}</td>
                <td className="px-2 text-right">{l.tipo === "F" ? "" : l.dias || ""}</td><td className="px-2 text-right font-semibold">{l.saldo}</td>
                <td className="px-2 text-right">{l.faltas || ""}</td><td className="px-2 text-right">{l.acumFaltas}</td><td className="px-2">{l.descricao}</td>
                <td className="px-2">{l.boletim_id ? <span className="text-xs text-muted-foreground">boletim</span> :
                  <button className="text-xs text-muted-foreground hover:text-destructive" onClick={async () => { await supabase.from("funcionario_lancamentos").delete().eq("id", l.id); refresh(); }}>remover</button>}</td>
              </tr>
            ))}
            {!linhas.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Sem lançamentos.</td></tr>}
          </tbody>
        </table>
      </div>
      <button className="text-xs text-destructive underline" onClick={excluirFunc}>Excluir funcionário</button>
    </div>
  );
}
