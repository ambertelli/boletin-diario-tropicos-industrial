import type { ItemProgramacao } from "./producao";

/** Item como entregue pelo app Programação Diária. */
export type ItemEspelho = {
  id: string;
  embaladeira: number;
  prioridade: number;
  produto: string;
  formato: string;
  metragem: number;
  fardos: number;
};

export type ItemProgramacaoEspelho = ItemProgramacao & { embaladeira: number; prioridade: number };

export function itemEspelhoParaProgramacao(i: ItemEspelho): ItemProgramacaoEspelho {
  return {
    id: i.id,
    embaladeira: Number(i.embaladeira) || 0,
    prioridade: Number(i.prioridade) || 0,
    marca: i.produto ?? "",
    formato: i.formato ?? "",
    metros: `${Number(i.metragem) || 0}m`,
    quantidade: Number(i.fardos) || 0,
  };
}
