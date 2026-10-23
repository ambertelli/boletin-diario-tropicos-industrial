import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { hojeISO, dataBR } from "@/lib/producao";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Product = { id: string; embaladeira: number; name: string; formato: string; metragem: number; rolos_por_pacote: number; pacotes_por_fardo: number; sort_order: number };
type Item = { id: string; embaladeira: number; prioridade: number; product_id: string | null; fardos: number; turno_06_12: number; turno_12_18: number; turno_18_00: number; turno_00_06: number; products?: Product | null };

export const Route = createFileRoute("/_authenticated/programacao-producao")({
  validateSearch: (search: Record<string, unknown>): { data?: string } => {
    const d = search.data;
    return typeof d === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(d) ? { data: d } : {};
  },
  head: () => ({ meta: [{ title: "Programação de produção – Diário de Produção" }] }),
  component: ProgramacaoProducao,
});

function ProgramacaoProducao() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const date = search.data ?? hojeISO();
  const qc = useQueryClient();
  const [novo, setNovo] = useState({ embaladeira: "1", name: "", formato: "", metragem: "30", rolos: "4", pacotes: "16" });
  const [novoItem, setNovoItem] = useState({ embaladeira: "1", product_id: "", fardos: "0" });
  const [saving, setSaving] = useState(false);
  const catalog = useQuery({
    queryKey: ["planner-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planner_products").select("*").order("embaladeira").order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });
  const schedule = useQuery({
    queryKey: ["planner-schedule", date],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada. Entre novamente.");
      const { data: s, error } = await supabase.from("planner_schedules").select("id").eq("user_id", auth.user.id).eq("schedule_date", date).maybeSingle();
      if (error) throw error;
      if (!s) return { id: null as string | null, items: [] as Item[] };
      const { data: items, error: itemError } = await supabase.from("planner_items").select("*, planner_products(*)").eq("schedule_id", s.id).order("embaladeira").order("prioridade");
      if (itemError) throw itemError;
      return { id: s.id as string, items: (items ?? []).map((i: any) => ({ ...i, products: i.planner_products })) as Item[] };
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["planner-products"] });
    qc.invalidateQueries({ queryKey: ["planner-schedule", date] });
  };
  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!novo.name.trim() || !novo.formato.trim()) return toast.error("Informe nome e formato do produto.");
    setSaving(true);
    const { error } = await supabase.from("planner_products").insert({
      embaladeira: Number(novo.embaladeira), name: novo.name.trim(), formato: novo.formato.trim(),
      metragem: Number(novo.metragem) || 0, rolos_por_pacote: Math.max(1, Number(novo.rolos) || 1),
      pacotes_por_fardo: Math.max(1, Number(novo.pacotes) || 1), sort_order: (catalog.data?.length ?? 0) + 1,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNovo({ ...novo, name: "", formato: "" });
    toast.success("Produto cadastrado");
    refresh();
  }
  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!novoItem.product_id) return toast.error("Selecione um produto.");
    setSaving(true);
    try {
      let scheduleId = schedule.data?.id;
      if (!scheduleId) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Sessão expirada. Entre novamente.");
        const { data: s, error } = await supabase.from("planner_schedules").insert({ user_id: auth.user.id, schedule_date: date }).select("id").single();
        if (error) throw error;
        scheduleId = s.id;
      }
      const existing = schedule.data?.items.filter(i => i.embaladeira === Number(novoItem.embaladeira)) ?? [];
      const { error } = await supabase.from("planner_items").insert({
        schedule_id: scheduleId, embaladeira: Number(novoItem.embaladeira),
        prioridade: existing.length + 1, product_id: novoItem.product_id, fardos: Math.max(0, Number(novoItem.fardos) || 0),
      });
      if (error) throw error;
      setNovoItem({ ...novoItem, fardos: "0" });
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível adicionar."); }
    finally { setSaving(false); }
  }
  async function updateItem(id: string, field: string, value: number) {
    const { error } = await supabase.from("planner_items").update({ [field]: Math.max(0, value) }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["planner-schedule", date] });
  }
  async function removeItem(id: string) {
    const { error } = await supabase.from("planner_items").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  const items = schedule.data?.items ?? [];
  const produtos = catalog.data ?? [];
  const productFor = (id: string | null) => produtos.find(p => p.id === id);
  const fardosTotal = items.reduce((n, i) => n + Number(i.fardos || 0), 0);
  const produzido = items.reduce((n, i) => n + Number(i.turno_06_12 || 0) + Number(i.turno_12_18 || 0) + Number(i.turno_18_00 || 0) + Number(i.turno_00_06 || 0), 0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-3xl font-bold">Programação de produção</h1><p className="text-muted-foreground">{dataBR(date)} · Planejamento por embaladeira e turno</p></div>
      <Input aria-label="Data da programação" type="date" className="w-44" value={date} onChange={e => navigate({ search: { data: e.target.value } })} />
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Itens programados" value={String(items.length)} />
      <Metric label="Fardos programados" value={fardosTotal.toLocaleString("pt-BR")} />
      <Metric label="Produção lançada nos turnos" value={produzido.toLocaleString("pt-BR")} />
    </div>
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="sheet-title">Cadastro rápido de produto</div>
      <form onSubmit={addProduct} className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-6">
        <select className="h-10 rounded-md border bg-background px-2" value={novo.embaladeira} onChange={e => setNovo({...novo,embaladeira:e.target.value})}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>{i+1===6?"Guardanapos":i+1===7?"Rolão":i+1===8?"Interfolha":`Embaladeira ${i+1}`}</option>)}</select>
        <Input placeholder="Nome / marca" value={novo.name} onChange={e=>setNovo({...novo,name:e.target.value})} required />
        <Input placeholder="Formato (ex. 16/4)" value={novo.formato} onChange={e=>setNovo({...novo,formato:e.target.value})} required />
        <Input type="number" min="0" placeholder="Metros" value={novo.metragem} onChange={e=>setNovo({...novo,metragem:e.target.value})}/>
        <Input type="number" min="1" placeholder="Rolos/pacote" value={novo.rolos} onChange={e=>setNovo({...novo,rolos:e.target.value})}/>
        <div className="flex gap-2"><Input type="number" min="1" placeholder="Pacotes/fardo" value={novo.pacotes} onChange={e=>setNovo({...novo,pacotes:e.target.value})}/><Button disabled={saving}>Cadastrar</Button></div>
      </form>
    </section>
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="sheet-title">Adicionar item à programação</div>
      <form onSubmit={addItem} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-4">
        <select className="h-10 rounded-md border bg-background px-2" value={novoItem.embaladeira} onChange={e=>setNovoItem({...novoItem,embaladeira:e.target.value,product_id:""})}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>Linha {i+1}</option>)}</select>
        <select className="h-10 rounded-md border bg-background px-2" value={novoItem.product_id} onChange={e=>setNovoItem({...novoItem,product_id:e.target.value})} required>
          <option value="">Selecione o produto</option>{produtos.filter(p=>p.embaladeira===Number(novoItem.embaladeira)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.formato} · {p.metragem}m</option>)}
        </select>
        <Input type="number" min="0" placeholder="Fardos programados" value={novoItem.fardos} onChange={e=>setNovoItem({...novoItem,fardos:e.target.value})}/>
        <Button disabled={saving || !produtos.length}>Adicionar à programação</Button>
      </form>
      {catalog.isLoading || schedule.isLoading ? <p className="p-4 text-sm text-muted-foreground">Carregando programação…</p> : (schedule.isError || catalog.isError) ? <p className="p-4 text-sm text-destructive">Não foi possível carregar. Confira se a migração foi aplicada e tente novamente.</p> : !items.length ? <p className="p-4 text-sm text-muted-foreground">Nenhum item programado nesta data. Cadastre um produto e adicione-o à programação.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="sheet-th">Linha / produto</th><th className="sheet-th">Fardos</th><th className="sheet-th">06–12</th><th className="sheet-th">12–18</th><th className="sheet-th">18–00</th><th className="sheet-th">00–06</th><th className="sheet-th">Saldo</th><th className="sheet-th"/></tr></thead><tbody>
      {items.map(i=>{const p=productFor(i.product_id); const prod=Number(i.turno_06_12||0)+Number(i.turno_12_18||0)+Number(i.turno_18_00||0)+Number(i.turno_00_06||0); return <tr key={i.id} className="border-t"><td className="px-2 py-2"><div className="font-medium">{p?.name ?? "Produto removido"}</div><div className="text-xs text-muted-foreground">Linha {i.embaladeira} · {p?.formato ?? ""} · {p?.metragem ?? 0}m</div></td><td className="px-2"><Input aria-label="Fardos programados" className="w-20" type="number" min="0" defaultValue={i.fardos} onBlur={e=>updateItem(i.id,"fardos",Number(e.target.value)||0)}/></td>{(["turno_06_12","turno_12_18","turno_18_00","turno_00_06"] as const).map((f,j)=><td className="px-2" key={f}><Input aria-label={["Turno 06 às 12","Turno 12 às 18","Turno 18 às 00","Turno 00 às 06"][j]} className="w-20" type="number" min="0" defaultValue={i[f]} onBlur={e=>updateItem(i.id,f,Number(e.target.value)||0)}/></td>)}<td className={`px-2 font-semibold ${Number(i.fardos)-prod<0?"text-green-600":"text-destructive"}`}>{(Number(i.fardos)-prod).toLocaleString("pt-BR")}</td><td><Button variant="ghost" size="sm" onClick={()=>removeItem(i.id)}>Excluir</Button></td></tr>})}
      </tbody></table></div>}
    </section>
    <p className="text-xs text-muted-foreground">Esta programação é armazenada separadamente da programação antiga até a validação do mapeamento. Os dados existentes do boletim não são modificados.</p>
  </div>;
}
function Metric({label,value}:{label:string;value:string}) { return <div className="rounded-md border bg-card p-4"><div className="text-sm font-semibold uppercase text-muted-foreground">{label}</div><div className="font-display text-3xl font-bold">{value}</div></div>; }
