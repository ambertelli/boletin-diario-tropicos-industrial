import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boletinsDiaQuery, boletinsMesQuery, cadastrosQuery, programacaoQuery, type Boletim } from "@/lib/dados";
import {
  HORARIOS, SECOES, TURMAS, calcularSaldos, chave, fmt, totalBoletim,
  type Acidente, type LinhaProducao, type Ocorrencia, type Parada, type Secao,
} from "@/lib/producao";
import { SaldoTabela } from "@/components/SaldoTabela";
import { Button } from "@/components/ui/button";

type Form = Omit<Boletim, "id">;
const LINHAS_POR_SECAO = 3;

function preencher(linhas: LinhaProducao[]) {
  const out: LinhaProducao[] = [];
  for (const s of SECOES) {
    const ex = linhas.filter((l) => l.secao === s.id);
    out.push(...ex);
    for (let i = ex.length; i < LINHAS_POR_SECAO; i++) out.push({ secao: s.id, marca: "", formato: "", metros: "", quantidade: 0 });
  }
  return out;
}

export function BoletimForm({ inicial, id }: { inicial: Form; id?: string }) {
  const [f, setF] = useState<Form>({
    ...inicial,
    producao: preencher(inicial.producao),
    paradas: inicial.paradas.length ? inicial.paradas : Array.from({ length: 4 }, () => ({ maquina: "", numero: "", inicio: "", fim: "", descricao: "" })),
    ocorrencias: inicial.ocorrencias.length ? inicial.ocorrencias : Array.from({ length: 3 }, () => ({ data: "", nome: "", turno: inicial.turma, ocorrencia: "" })),
  });
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const prog = useQuery(programacaoQuery(f.data));
  const dia = useQuery(boletinsDiaQuery(f.data));
  const mes = useQuery(boletinsMesQuery(f.data));
  const cad = useQuery(cadastrosQuery);

  const outrosDia = (dia.data ?? []).filter((b) => b.id !== id);
  const linhasValidas = f.producao.filter((l) => l.marca || l.formato || l.quantidade);
  const total = totalBoletim(linhasValidas);
  const acumDia = outrosDia.reduce((a, b) => a + totalBoletim(b.producao), 0) + total;
  const acumMes = (mes.data ?? []).filter((b) => b.id !== id && b.data <= f.data).reduce((a, b) => a + totalBoletim(b.producao), 0) + total;
  const todasLinhas = [...outrosDia.flatMap((b) => b.producao), ...linhasValidas];
  const { itens } = calcularSaldos(prog.data ?? [], todasLinhas);
  const saldoDe = (l: LinhaProducao) => itens.find((i) => chave(i.marca, i.formato, i.metros) === chave(l.marca, l.formato, l.metros));

  const setLinha = (idx: number, k: keyof LinhaProducao, v: string) =>
    setF((p) => ({ ...p, producao: p.producao.map((l, i) => (i === idx ? { ...l, [k]: k === "quantidade" ? Number(v) || 0 : v } : l)) }));
  const addLinha = (secao: Secao) => setF((p) => {
    const last = p.producao.map((l) => l.secao).lastIndexOf(secao);
    const arr = [...p.producao];
    arr.splice(last + 1, 0, { secao, marca: "", formato: "", metros: "", quantidade: 0 });
    return { ...p, producao: arr };
  });
  const setArr = <K extends "paradas" | "ocorrencias">(k: K, i: number, campo: string, v: string) =>
    setF((p) => ({ ...p, [k]: (p[k] as Record<string, string>[]).map((x, j) => (j === i ? { ...x, [campo]: v } : x)) }));
  const setAc = (k: keyof Acidente, v: string) => setF((p) => ({ ...p, acidente: { ...p.acidente, [k]: v } }));

  async function salvar() {
    setBusy(true);
    const payload = {
      data: f.data, turma: f.turma, horario: f.horario, lider: f.lider, observacoes: f.observacoes,
      producao: linhasValidas,
      paradas: f.paradas.filter((x) => Object.values(x).some(Boolean)),
      ocorrencias: f.ocorrencias.filter((x) => x.nome || x.ocorrencia),
      acidente: f.acidente,
      updated_at: new Date().toISOString(),
    };
    const r = id
      ? await supabase.from("boletins").update(payload as never).eq("id", id).select("id").single()
      : await supabase.from("boletins").insert(payload as never).select("id").single();
    setBusy(false);
    if (r.error) {
      toast.error(r.error.code === "23505" ? "Já existe boletim para este dia e horário" : r.error.message);
      return;
    }
    toast.success("Boletim salvo — programação atualizada");
    qc.invalidateQueries({ queryKey: ["boletins"] });
    qc.invalidateQueries({ queryKey: ["boletim"] });
    navigate({ to: "/boletim/$id", params: { id: r.data.id } });
  }

  async function excluir() {
    if (!id || !confirm("Excluir este boletim? A produção volta para o saldo da programação.")) return;
    await supabase.from("boletins").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["boletins"] });
    navigate({ to: "/historico" });
  }

  const opts = (t: string) => (cad.data ?? []).filter((c) => c.tipo === t).map((c) => <option key={c.id} value={c.nome} />);
  const progOpts = (k: "marca" | "formato" | "metros") =>
    [...new Set((prog.data ?? []).map((p) => p[k]))].map((v) => <option key={"p" + v} value={v} />);

  return (
    <div className="space-y-4">
      <datalist id="bm">{progOpts("marca")}{opts("marca")}</datalist>
      <datalist id="bf">{progOpts("formato")}{opts("formato")}</datalist>
      <datalist id="bt">{progOpts("metros")}{opts("metros")}</datalist>

      <div className="no-print flex flex-wrap justify-end gap-2">
        {id && <Button variant="ghost" onClick={excluir}>Excluir</Button>}
        {id && <Button variant="outline" onClick={() => window.print()}>Imprimir</Button>}
        <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar boletim"}</Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="flex items-center border-b">
          <div className="bg-primary px-4 py-2 font-display text-2xl font-bold text-primary-foreground">TRÓPICO'S</div>
          <div className="flex-1 bg-section py-3 text-center font-display text-lg font-bold">BOLETIM CONVERSÃO</div>
        </div>
        <div className="grid grid-cols-2 border-b text-sm sm:grid-cols-6">
          <Cab label="Turma">
            <select className="sheet-cell font-bold" value={f.turma} onChange={(e) => setF({ ...f, turma: e.target.value })}>
              {TURMAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Cab>
          <Cab label="Horário">
            <select className="sheet-cell font-bold" value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })}>
              {HORARIOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Cab>
          <Cab label="Data"><input type="date" className="sheet-cell font-bold" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Cab>
        </div>
        <div className="grid grid-cols-[auto_1fr] text-sm">
          <div className="border-r px-2 py-1.5 font-semibold">Líder</div>
          <input className="sheet-cell font-bold" value={f.lider} onChange={(e) => setF({ ...f, lider: e.target.value })} />
        </div>

        <div className="sheet-title border-t">Controle de Produção Diária</div>
        <div className="grid md:grid-cols-2">
          {SECOES.filter((s) => s.total).map((s) => (
            <SecaoTabela key={s.id} s={s} linhas={f.producao} setLinha={setLinha} addLinha={addLinha} saldoDe={saldoDe} />
          ))}
        </div>

        <div className="grid grid-cols-3 border-t text-center">
          {[["TOTAL", total], ["Acumulado/dia", acumDia], ["Acumulado mês", acumMes]].map(([l, v], i) => (
            <div key={l as string} className="border-r last:border-r-0">
              <div className="bg-sheet-head py-1 text-sm font-bold">{l}</div>
              <div className={`py-1.5 text-lg font-bold ${i === 2 ? "text-destructive" : ""}`}>{fmt(v as number)}</div>
            </div>
          ))}
        </div>

        {SECOES.filter((s) => !s.total).map((s) => (
          <div key={s.id}>
            <div className="sheet-title border-t bg-sheet-head">{s.titulo}</div>
            <SecaoTabela s={s} linhas={f.producao} setLinha={setLinha} addLinha={addLinha} saldoDe={saldoDe} semTitulo />
          </div>
        ))}

        <div className="sheet-title border-t">Paradas de Máquinas</div>
        <table className="w-full text-sm">
          <thead><tr>
            <th className="sheet-th w-40">Máquina</th><th className="sheet-th w-28">Nº</th><th className="sheet-th w-24">Início</th><th className="sheet-th w-24">Fim</th><th className="sheet-th">Descrição da parada</th>
          </tr></thead>
          <tbody>
            {f.paradas.map((p, i) => (
              <tr key={i} className="border-t">
                {(["maquina", "numero", "inicio", "fim", "descricao"] as (keyof Parada)[]).map((k) => (
                  <td key={k} className="border-r last:border-r-0"><input className="sheet-cell" value={p[k]} onChange={(e) => setArr("paradas", i, k, e.target.value)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <AddBtn onClick={() => setF({ ...f, paradas: [...f.paradas, { maquina: "", numero: "", inicio: "", fim: "", descricao: "" }] })} />

        <div className="sheet-title border-t">Ocorrências com Funcionários</div>
        <table className="w-full text-sm">
          <thead><tr><th className="sheet-th w-32">Data</th><th className="sheet-th">Nome</th><th className="sheet-th w-20">Turno</th><th className="sheet-th">Ocorrência</th></tr></thead>
          <tbody>
            {f.ocorrencias.map((o, i) => (
              <tr key={i} className="border-t">
                {(["data", "nome", "turno", "ocorrencia"] as (keyof Ocorrencia)[]).map((k) => (
                  <td key={k} className="border-r last:border-r-0"><input className="sheet-cell" value={o[k]} onChange={(e) => setArr("ocorrencias", i, k, e.target.value)} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <AddBtn onClick={() => setF({ ...f, ocorrencias: [...f.ocorrencias, { data: "", nome: "", turno: f.turma, ocorrencia: "" }] })} />

        <div className="sheet-title border-t">Acidente de trabalho</div>
        <div className="grid text-sm sm:grid-cols-2">
          {([["nome", "Nome"], ["funcao", "Função"], ["local", "Local do acidente"], ["parte", "Parte do corpo atingida"], ["agente", "Agente causador"], ["testemunha", "Testemunha"]] as [keyof Acidente, string][]).map(([k, l]) => (
            <div key={k} className="grid grid-cols-[11rem_1fr] border-b sm:odd:border-r">
              <div className="px-2 py-1.5 font-semibold">{l}:</div>
              <input className="sheet-cell" value={f.acidente[k] ?? ""} onChange={(e) => setAc(k, e.target.value)} />
            </div>
          ))}
        </div>
        {([["providencias", "Providências tomadas"], ["descricao", "Descrição do acidente"]] as [keyof Acidente, string][]).map(([k, l]) => (
          <div key={k} className="grid grid-cols-[11rem_1fr] border-b text-sm">
            <div className="px-2 py-1.5 font-semibold">{l}:</div>
            <textarea rows={2} className="sheet-cell h-auto py-1" value={f.acidente[k] ?? ""} onChange={(e) => setAc(k, e.target.value)} />
          </div>
        ))}

        <div className="sheet-title">Observações</div>
        <textarea rows={4} className="sheet-cell h-auto py-2" value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
      </div>

      <section className="no-print overflow-hidden rounded-md border bg-card">
        <div className="sheet-title">Saldo da programação do dia (com este boletim)</div>
        <SaldoTabela programacao={prog.data ?? []} linhas={todasLinhas} />
      </section>
    </div>
  );
}

function Cab({ label, children }: { label: string; children: React.ReactNode }) {
  return (<>
    <div className="border-r px-2 py-1.5 font-semibold">{label}:</div>
    <div className="border-r">{children}</div>
  </>);
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="no-print w-full border-t py-1 text-xs text-muted-foreground hover:bg-muted">+ linha</button>;
}

function SecaoTabela({ s, linhas, setLinha, addLinha, saldoDe, semTitulo }: {
  s: (typeof SECOES)[number];
  linhas: LinhaProducao[];
  setLinha: (i: number, k: keyof LinhaProducao, v: string) => void;
  addLinha: (s: Secao) => void;
  saldoDe: (l: LinhaProducao) => { saldo: number } | undefined;
  semTitulo?: boolean;
}) {
  const idxs = linhas.map((l, i) => (l.secao === s.id ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="border-t md:odd:border-r">
      {!semTitulo && <div className="border-b py-1 text-center text-sm font-bold">{s.titulo}</div>}
      <table className="w-full text-sm">
        <thead><tr>
          {s.marca && <th className="sheet-th">Marca</th>}
          {s.formato && <th className="sheet-th">Formato</th>}
          {s.medida && <th className="sheet-th w-20">{s.medida}</th>}
          <th className="sheet-th w-24">Produção</th>
          <th className="sheet-th no-print w-24">Saldo prog.</th>
        </tr></thead>
        <tbody>
          {idxs.map((i) => {
            const l = linhas[i]!;
            const sd = l.marca ? saldoDe(l) : undefined;
            return (
              <tr key={i} className="border-t">
                {s.marca && <td className="border-r"><input list="bm" className="sheet-cell" value={l.marca} onChange={(e) => setLinha(i, "marca", e.target.value)} /></td>}
                {s.formato && <td className="border-r"><input list="bf" className="sheet-cell" value={l.formato} onChange={(e) => setLinha(i, "formato", e.target.value)} /></td>}
                {s.medida && <td className="border-r"><input list="bt" className="sheet-cell" value={l.metros} onChange={(e) => setLinha(i, "metros", e.target.value)} /></td>}
                <td className="border-r"><input type="number" min={0} className="sheet-cell text-right font-semibold" value={l.quantidade || ""} onChange={(e) => setLinha(i, "quantidade", e.target.value)} /></td>
                <td className={`no-print px-2 text-right text-xs ${sd ? (sd.saldo <= 0 ? "text-success" : "text-primary") : "text-muted-foreground"}`}>
                  {sd ? fmt(sd.saldo) : l.marca ? "fora" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <AddBtn onClick={() => addLinha(s.id)} />
    </div>
  );
}
