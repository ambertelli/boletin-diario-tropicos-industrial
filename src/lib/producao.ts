export const TURMAS = ["A", "B", "C", "D"] as const;
export const HORARIOS = ["00:00 as 06:00", "06:00 as 12:00", "12:00 as 18:00", "18:00 as 24:00"] as const;

export type Secao =
  | "emb1" | "emb2" | "emb3" | "emb4" | "emb5"
  | "segunda" | "guardanapo" | "rolao" | "interfolha";

export const SECOES: { id: Secao; titulo: string; medida: string; marca: boolean; formato: boolean; total: boolean }[] = [
  { id: "emb1", titulo: "Embaladeira Nº 1 - 4 Rolos", medida: "Metros", marca: true, formato: true, total: true },
  { id: "emb2", titulo: "Embaladeira Nº 2 - 12/16 Rolos", medida: "Metros", marca: true, formato: true, total: true },
  { id: "emb3", titulo: "Embaladeira Nº 3 - 8 Rolos", medida: "Metros", marca: true, formato: true, total: true },
  { id: "emb4", titulo: "Embaladeira Nº 4 - 12/16 Rolos", medida: "Metros", marca: true, formato: true, total: true },
  { id: "emb5", titulo: "Embaladeira Nº 5 - Toalha 2 Rolos", medida: "Folhas", marca: true, formato: true, total: true },
  { id: "segunda", titulo: "Produção de Segunda Escolha", medida: "Metros", marca: false, formato: true, total: false },
  { id: "guardanapo", titulo: "Produção de Guardanapos", medida: "", marca: true, formato: true, total: false },
  { id: "rolao", titulo: "Produção de Rolão", medida: "Metros", marca: true, formato: false, total: false },
  { id: "interfolha", titulo: "Produção de Interfolhas", medida: "", marca: true, formato: true, total: false },
];

export type LinhaProducao = { secao: Secao; marca: string; formato: string; metros: string; quantidade: number };
export type Parada = { maquina: string; numero: string; inicio: string; fim: string; descricao: string };
export type Ocorrencia = { data: string; nome: string; turno: string; ocorrencia: string };
export type Acidente = Partial<Record<"nome" | "funcao" | "local" | "parte" | "agente" | "testemunha" | "providencias" | "descricao", string>>;

export type ItemProgramacao = { id: string; marca: string; formato: string; metros: string; quantidade: number };

const norm = (s: string) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const chave = (marca: string, formato: string, metros: string) =>
  `${norm(marca)}|${norm(formato)}|${norm(metros)}`;

/** Soma das linhas que entram no TOTAL do boletim (embaladeiras). */
export function totalBoletim(linhas: LinhaProducao[]): number {
  const contam = new Set(SECOES.filter((s) => s.total).map((s) => s.id));
  return linhas.filter((l) => contam.has(l.secao)).reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
}

export type Saldo = ItemProgramacao & { produzido: number; saldo: number };

/** Debita da programação do dia toda produção com mesma marca+formato+metros. */
export function calcularSaldos(programacao: ItemProgramacao[], linhas: LinhaProducao[]) {
  const produzido = new Map<string, number>();
  for (const l of linhas) {
    if (!l.marca && !l.formato) continue;
    const k = chave(l.marca, l.formato, l.metros);
    produzido.set(k, (produzido.get(k) ?? 0) + (Number(l.quantidade) || 0));
  }
  const usadas = new Set<string>();
  const itens: Saldo[] = programacao.map((p) => {
    const k = chave(p.marca, p.formato, p.metros);
    const prod = usadas.has(k) ? 0 : produzido.get(k) ?? 0;
    usadas.add(k);
    return { ...p, produzido: prod, saldo: p.quantidade - prod };
  });
  const fora: { marca: string; formato: string; metros: string; quantidade: number }[] = [];
  for (const l of linhas) {
    const k = chave(l.marca, l.formato, l.metros);
    if ((!l.marca && !l.formato) || usadas.has(k)) continue;
    const f = fora.find((x) => chave(x.marca, x.formato, x.metros) === k);
    if (f) f.quantidade += Number(l.quantidade) || 0;
    else fora.push({ marca: l.marca, formato: l.formato, metros: l.metros, quantidade: Number(l.quantidade) || 0 });
  }
  return { itens, fora };
}

export function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export const fmt = (n: number) => n.toLocaleString("pt-BR");
export const dataBR = (iso: string) => iso.split("-").reverse().join("/");
