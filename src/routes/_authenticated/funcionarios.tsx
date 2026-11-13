import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TURMAS } from "@/lib/producao";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const funcionariosQuery = {
  queryKey: ["funcionarios"],
  queryFn: async () => {
    const { data, error } = await supabase.from("funcionarios").select("*").order("nome");
    if (error) throw error;
    return data;
  },
};

export const Route = createFileRoute("/_authenticated/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários – Diário de Produção" }, { name: "description", content: "Equipe por turma, férias e faltas." }] }),
  component: Funcionarios,
});

function Funcionarios() {
  const q = useQuery(funcionariosQuery);
  const qc = useQueryClient();
  const [turma, setTurma] = useState<string>("Todas");
  const [n, setN] = useState({ nome: "", funcao: "", turma: "A", vencimento_ferias: "" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!n.nome.trim()) return;
    const { error } = await supabase.from("funcionarios").insert({ ...n, nome: n.nome.trim(), vencimento_ferias: n.vencimento_ferias || null });
    if (error) return toast.error(error.message);
    setN({ ...n, nome: "", funcao: "" });
    qc.invalidateQueries({ queryKey: ["funcionarios"] });
  }
  const lista = (q.data ?? []).filter((f) => turma === "Todas" || f.turma === turma);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Funcionários</h1>
      <div className="flex flex-wrap gap-2">
        {["Todas", ...TURMAS].map((t) => (
          <Button key={t} size="sm" variant={turma === t ? "default" : "outline"} onClick={() => setTurma(t)}>{t === "Todas" ? "Todas" : `Turma ${t}`}</Button>
        ))}
      </div>
      <form onSubmit={add} className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-[2fr_2fr_6rem_10rem_auto]">
        <Input placeholder="Nome" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} />
        <Input placeholder="Função" value={n.funcao} onChange={(e) => setN({ ...n, funcao: e.target.value })} />
        <select className="rounded-md border bg-background px-2" value={n.turma} onChange={(e) => setN({ ...n, turma: e.target.value })}>
          {TURMAS.map((t) => <option key={t} value={t}>Turma {t}</option>)}
        </select>
        <Input type="date" title="Vencimento de férias" value={n.vencimento_ferias} onChange={(e) => setN({ ...n, vencimento_ferias: e.target.value })} />
        <Button>Cadastrar</Button>
      </form>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead><tr><th className="sheet-th">Nome</th><th className="sheet-th">Função</th><th className="sheet-th">Turma</th><th className="sheet-th">Venc. férias</th></tr></thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-1.5"><Link to="/funcionario/$id" params={{ id: f.id }} className="font-semibold text-primary underline">{f.nome}</Link></td>
                <td className="px-3">{f.funcao}</td><td className="px-3">{f.turma}</td>
                <td className="px-3">{f.vencimento_ferias ? f.vencimento_ferias.split("-").reverse().join("/") : "—"}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum funcionário.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
