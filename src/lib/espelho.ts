import type { ItemProgramacao } from "./producao";

/** Item como entregue pelo app Programação Diária. */
export type ItemEspelho = {
  id: string;
  embaladeira: number;
  prioridade: number;
  prioridade_fabricacao?: number | null;
  produto: string;
  formato: string;
  metragem: number;
  fardos: number;
};

export type ItemProgramacaoEspelho = ItemProgramacao & { embaladeira: number; prioridade: number };

export function itemEspelhoParaProgramacao(i: ItemEspelho): ItemProgramacaoEspelho {
  const pf = Number(i.prioridade_fabricacao);
  return {
    id: i.id,
    embaladeira: Number(i.embaladeira) || 0,
    prioridade: Number(i.prioridade) || 0,
    prioridadeFabricacao: i.prioridade_fabricacao != null && pf > 0 ? pf : null,
    marca: i.produto ?? "",
    formato: i.formato ?? "",
    metros: `${Number(i.metragem) || 0}m`,
    quantidade: Number(i.fardos) || 0,
  };
}

/** Ordena pela prioridade de fabricação; itens sem prioridade vão para o fim, na ordem original. */
export function ordenarPorPrioridade<T extends ItemProgramacao>(itens: T[]): T[] {
  return itens
    .map((i, k) => ({ i, k }))
    .sort((a, b) => (a.i.prioridadeFabricacao ?? Infinity) - (b.i.prioridadeFabricacao ?? Infinity) || a.k - b.k)
    .map((x) => x.i);
}
