import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { boletinsDiaQuery, cadastrosQuery, programacaoQuery } from "@/lib/dados";
import { dataBR, hojeISO } from "@/lib/producao";
import { SaldoTabela } from "@/components/SaldoTabela";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/programacao")({
  validateSearch: z.object({ data: z.string().optional() }),
  head: () => ({ meta: [{ title: "Programação diária – Diário de Produção" }] }),
  component: Programacao,
});

function Programacao() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const data = search.data ?? hojeISO();
  const qc = useQueryClient();
  const prog = useQuery(programacaoQuery(data));
  const dia = useQuery(boletinsDiaQuery(data));
  const cad = useQuery(cadastrosQuery);
  const [novo, setNovo] = useState({ marca: "", formato: "", metros: "", quantidade: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["programacao", data] });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(novo.quantidade, 10);
    if (!novo.marca || !q) { toast.error("Informe marca e quantidade"); return; }
    const { error } = await supabase.from("programacao_itens").insert({ data, marca: novo.marca, formato: novo.formato, metros: novo.metros, quantidade: q });
    if (error) { toast.error(error.message); return; }
    setNovo({ marca: "", formato: "", metros: "", quantidade: "" });
    refresh();
  }
  async function remover(id: string) {
    await supabase.from("programacao_itens").delete().eq("id", id);
    refresh();
  }
  async function alterarQtd(id: string, v: string) {
    await supabase.from("programacao_itens").update({ quantidade: parseInt(v, 10) || 0 }).eq("id", id);
    refresh();
  }

  const opts = (t: string) => (cad.data ?? []).filter((c) => c.tipo === t).map((c) => <option key={c.id} value={c.nome} />);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Programação diária</h1>
          <p className="text-muted-foreground">{dataBR(data)}</p>
        </div>
        <Input type="date" className="w-44" value={data} onChange={(e) => navigate({ search: { data: e.target.value } })} />
      </div>

      <datalist id="pm">{opts("marca")}</datalist>
      <datalist id="pf">{opts("formato")}</datalist>
      <datalist id="pt">{opts("metros")}</datalist>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="sheet-title">Itens programados</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left">
            <th className="sheet-th">Marca</th><th className="sheet-th">Formato</th><th className="sheet-th">Metros/Folhas</th>
            <th className="sheet-th w-36">Quantidade</th><th className="sheet-th w-20" />
          </tr></thead>
          <tbody>
            {(prog.data ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-2 py-1">{p.marca}</td><td className="px-2">{p.formato}</td><td className="px-2">{p.metros}</td>
                <td><input className="sheet-cell" type="number" defaultValue={p.quantidade} onBlur={(e) => alterarQtd(p.id, e.target.value)} /></td>
                <td className="text-center"><Button size="sm" variant="ghost" onClick={() => remover(p.id)}>Excluir</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={adicionar} className="grid grid-cols-2 gap-2 border-t bg-muted/40 p-3 sm:grid-cols-5">
          <Input list="pm" placeholder="Marca" value={novo.marca} onChange={(e) => setNovo({ ...novo, marca: e.target.value })} />
          <Input list="pf" placeholder="Formato" value={novo.formato} onChange={(e) => setNovo({ ...novo, formato: e.target.value })} />
          <Input list="pt" placeholder="Metros" value={novo.metros} onChange={(e) => setNovo({ ...novo, metros: e.target.value })} />
          <Input type="number" placeholder="Quantidade" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} />
          <Button>Adicionar</Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="sheet-title">Saldo em tempo real</div>
        <SaldoTabela programacao={prog.data ?? []} linhas={(dia.data ?? []).flatMap((b) => b.producao)} />
      </section>
    </div>
  );
}
