import { get, set } from "idb-keyval";

export type Operacao =
  | { tipo: "salvar"; id: string; payload: Record<string, unknown> }
  | { tipo: "excluir"; id: string };

const CHAVE = "fila-boletins";
type Ouvinte = (n: number, sincronizando: boolean) => void;
const ouvintes = new Set<Ouvinte>();
let sincronizando = false;
let total = 0;

function avisar() { ouvintes.forEach((o) => o(total, sincronizando)); }

export function ouvirFila(o: Ouvinte) {
  ouvintes.add(o);
  o(total, sincronizando);
  return () => { ouvintes.delete(o); };
}

export async function lerFila(): Promise<Operacao[]> {
  return (await get<Operacao[]>(CHAVE)) ?? [];
}

async function gravar(fila: Operacao[]) {
  await set(CHAVE, fila);
  total = fila.length;
  avisar();
}

/** Adiciona/substitui a operação do mesmo boletim (a última vence). */
export async function enfileirar(op: Operacao) {
  const fila = (await lerFila()).filter((x) => x.id !== op.id);
  fila.push(op);
  await gravar(fila);
}

export type Executor = (op: Operacao) => Promise<{ ok: true } | { ok: false; rede: boolean; mensagem: string }>;

/** Envia a fila em ordem. Para no primeiro erro de rede; descarta (e reporta) erros de regra. */
export async function sincronizar(exec: Executor, onRejeitado?: (op: Operacao, msg: string) => void) {
  if (sincronizando) return 0;
  sincronizando = true;
  avisar();
  let enviados = 0;
  try {
    let fila = await lerFila();
    total = fila.length;
    while (fila.length) {
      const op = fila[0]!;
      const r = await exec(op);
      if (!r.ok && r.rede) break;
      if (!r.ok) onRejeitado?.(op, r.mensagem);
      else enviados++;
      fila = fila.slice(1);
      await gravar(fila);
    }
  } finally {
    sincronizando = false;
    avisar();
  }
  return enviados;
}

export function erroDeRede(e: { message?: string } | null | undefined) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const m = e?.message ?? "";
  return /fetch|network|load failed/i.test(m);
}
