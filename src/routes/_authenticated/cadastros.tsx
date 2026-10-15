import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cadastrosQuery } from "@/lib/dados";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros – Diário de Produção" }] }),
  component: Cadastros,
});

const TIPOS = [["marca", "Marcas"], ["formato", "Formatos"], ["metros", "Metros / Folhas"]] as const;

function Cadastros() {
  const q = useQuery(cadastrosQuery);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Cadastros</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {TIPOS.map(([t, l]) => <Lista key={t} tipo={t} titulo={l} itens={(q.data ?? []).filter((c) => c.tipo === t)} />)}
      </div>
    </div>
  );
}

function Lista({ tipo, titulo, itens }: { tipo: string; titulo: string; itens: { id: string; nome: string }[] }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["cadastros"] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const { error } = await supabase.from("cadastros").insert({ tipo, nome: nome.trim() });
    if (error) return toast.error(error.code === "23505" ? "Já cadastrado" : error.message);
    setNome(""); refresh();
  }
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="sheet-title">{titulo}</div>
      <ul>
        {itens.map((i) => (
          <li key={i.id} className="flex items-center justify-between border-b px-3 py-1.5 text-sm">
            {i.nome}
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={async () => { await supabase.from("cadastros").delete().eq("id", i.id); refresh(); }}>remover</button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2 p-2"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Novo" /><Button size="sm">+</Button></form>
    </div>
  );
}
