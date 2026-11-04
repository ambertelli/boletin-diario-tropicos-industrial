import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { boletinsDiaQuery, boletinsMesQuery, cadastrosQuery, programacaoQuery, type Boletim } from "@/lib/dados";
import { enfileirar, erroDeRede } from "@/lib/fila";
import {
  HORARIOS, SECOES, SEGUNDA_METRAGENS, SEGUNDA_PRODUTOS, TURMAS, calcularSaldos, chave, fmt, totalBoletim,
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
  const todasLinhas = [...outrosDia.flatMap((b) => b.producao), ...linhasValidas].filter((l) => l.secao !== "segunda");
  const { itens } = calcularSaldos(prog.data ?? [], todasLinhas);
  const saldoDe = (l: LinhaProducao) => itens.find((i) => chave(i.marca, i.formato, i.metros) === chave(l.marca, l.formato, l.metros));

  const setLinha = (idx: number, k: keyof LinhaProducao, v: string) =>
    setF((p) => ({ ...p, producao: p.producao.map((l, i) => {
      if (i !== idx) return l;
      if (k === "quantidade") return { ...l, quantidade: Number(v) || 0 };
      if (k === "marca") {
        const it = (prog.data ?? []).find((x) => x.marca.trim().toLowerCase() === v.trim().toLowerCase());
        return { ...l, marca: v, formato: it?.formato ?? "", metros: it?.metros ?? "" };
      }
      return { ...l, [k]: v };
    }) }));
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
    const bid = id ?? crypto.randomUUID();
    const salvarOffline = async () => {
      await enfileirar({ tipo: "salvar", id: bid, payload });
      const local = { id: bid, ...payload } as unknown as Boletim;
      qc.setQueryData<Boletim[]>(["boletins", "dia", f.data], (old) => [...(old ?? []).filter((b) => b.id !== bid), local]);
      qc.setQueryData<Boletim[]>(["boletins", "mes", f.data.slice(0, 7)], (old) => [...(old ?? []).filter((b) => b.id !== bid), local]);
      qc.setQueryData(["boletim", bid], local);
      setBusy(false);
      toast.warning("Sem conexão — boletim guardado no aparelho e será enviado automaticamente");
      navigate({ to: "/painel" });
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) return salvarOffline();
    let r;
    try {
      r = id
        ? await supabase.from("boletins").update(payload as never).eq("id", id).select("id").single()
        : await supabase.from("boletins").insert({ id: bid, ...payload } as never).select("id").single();
    } catch {
      return salvarOffline();
    }
    if (r.error && erroDeRede(r.error)) return salvarOffline();
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
    const r = navigator.onLine ? await supabase.from("boletins").delete().eq("id", id).then((x) => x, (e) => ({ error: e })) : { error: { message: "offline" } };
    if (r.error && erroDeRede(r.error)) {
      await enfileirar({ tipo: "excluir", id });
      qc.setQueriesData<Boletim[]>({ queryKey: ["boletins"] }, (old) => old?.filter((b) => b.id !== id));
      toast.warning("Sem conexão — exclusão será enviada automaticamente");
    } else {
      qc.invalidateQueries({ queryKey: ["boletins"] });
    }
    navigate({ to: "/historico" });
  }

  async function cadastrarSegunda() {
    const nome = prompt("Nome do novo produto da Segunda Escolha:")?.trim();
    if (!nome) return;
    const { error } = await supabase.from("cadastros").insert({ tipo: "segunda", nome });
    if (error) { toast.error(error.code === "23505" ? "Já cadastrado" : error.message); return; }
    toast.success("Produto cadastrado");
    qc.invalidateQueries({ queryKey: ["cadastros"] });
  }

  const opts = (t: string) => (cad.data ?? []).filter((c) => c.tipo === t).map((c) => <option key={c.id} value={c.nome} />);

  return (
    <div className="space-y-4">
      {SECOES.map((s, n) => {
        const todos = (prog.data ?? []) as { marca: string; embaladeira?: number }[];
        const daSecao = s.total ? todos.filter((x) => x.embaladeira === n + 1) : [];
        const lista = [...new Set((daSecao.length ? daSecao : todos).map((x) => x.marca))];
        return <datalist key={s.id} id={"bm-" + s.id}>{lista.map((v) => <option key={v} value={v} />)}{opts("marca")}</datalist>;
      })}

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
          <input className="sheet-cell font-bold" list="bl-lideres" value={f.lider} onChange={(e) => setF({ ...f, lider: e.target.value })} />
          <datalist id="bl-lideres">{opts("lider")}</datalist>
        </div>

        <div className="grid grid-cols-3 border-t border-b text-center">
          {[["TOTAL", total], ["Acumulado/dia", acumDia], ["Acumulado mês", acumMes]].map(([l, v], i) => (
            <div key={l as string} className="border-r last:border-r-0">
              <div className="bg-sheet-head py-1 text-sm font-bold">{l}</div>
              <div className={`py-1.5 text-lg font-bold ${i === 2 ? "text-destructive" : ""}`}>{fmt(v as number)}</div>
            </div>
          ))}
        </div>

        <section className="no-print">
          <div className="sheet-title">Saldo da programação do dia (com este boletim)</div>
          <SaldoTabela programacao={prog.data ?? []} linhas={todasLinhas} />
        </section>

        <div className="sheet-title border-t">Controle de Produção Diária</div>
        <div className="grid md:grid-cols-2">
          {SECOES.filter((s) => s.total).map((s) => (
            <SecaoTabela key={s.id} s={s} linhas={f.producao} setLinha={setLinha} addLinha={addLinha} saldoDe={saldoDe} />
          ))}
        </div>


        {SECOES.filter((s) => !s.total).map((s) => (
          <div key={s.id}>
            <div className="sheet-title border-t bg-sheet-head">{s.titulo}</div>
            <SegundaTabela linhas={f.producao} setLinha={setLinha} addLinha={addLinha} produtos={[...SEGUNDA_PRODUTOS, ...(cad.data ?? []).filter((c) => c.tipo === "segunda").map((c) => c.nome)]} onCadastrar={cadastrarSegunda} />
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

function SegundaTabela({ linhas, setLinha, addLinha, produtos, onCadastrar }: {
  linhas: LinhaProducao[];
  setLinha: (i: number, k: keyof LinhaProducao, v: string) => void;
  addLinha: (s: Secao) => void;
  produtos: string[];
  onCadastrar: () => void;
}) {
  const idxs = linhas.map((l, i) => (l.secao === "segunda" ? i : -1)).filter((i) => i >= 0);
  return (
    <div>
      <table className="w-full text-sm">
        <thead><tr><th className="sheet-th">Produto</th><th className="sheet-th w-32">Metragem</th><th className="sheet-th w-24">Produção</th></tr></thead>
        <tbody>
          {idxs.map((i) => {
            const l = linhas[i]!;
            return (
              <tr key={i} className="border-t">
                <td className="border-r">
                  <select className="sheet-cell" value={l.marca} onChange={(e) => setLinha(i, "formato", "") || setLinha(i, "marca", e.target.value)}>
                    <option value="" />
                    {[...new Set([...produtos, ...(l.marca ? [l.marca] : [])])].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="border-r">
                  <select className="sheet-cell" value={l.metros} onChange={(e) => setLinha(i, "metros", e.target.value)}>
                    <option value="" />
                    {SEGUNDA_METRAGENS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </td>
                <td><input type="number" min={0} className="sheet-cell text-right font-semibold" value={l.quantidade || ""} onChange={(e) => setLinha(i, "quantidade", e.target.value)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="no-print flex border-t">
        <button type="button" onClick={() => addLinha("segunda")} className="flex-1 py-1 text-xs text-muted-foreground hover:bg-muted">+ linha</button>
        <button type="button" onClick={onCadastrar} className="flex-1 border-l py-1 text-xs text-primary hover:bg-muted">+ cadastrar produto</button>
      </div>
    </div>
  );
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
          <th className="sheet-th">Marca</th>
          <th className="sheet-th w-24">Produção</th>
          <th className="sheet-th no-print w-24">Saldo prog.</th>
        </tr></thead>
        <tbody>
          {idxs.map((i) => {
            const l = linhas[i]!;
            const sd = l.marca ? saldoDe(l) : undefined;
            return (
              <tr key={i} className="border-t">
                <td className="border-r"><input list={"bm-" + s.id} className="sheet-cell" value={l.marca} onChange={(e) => setLinha(i, "marca", e.target.value)} /></td>
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
