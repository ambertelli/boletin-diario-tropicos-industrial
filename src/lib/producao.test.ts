import { describe, it, expect } from "vitest";
import { calcularSaldos, totalBoletim, type LinhaProducao } from "./producao";

const l = (secao: LinhaProducao["secao"], marca: string, formato: string, metros: string, quantidade: number): LinhaProducao => ({ secao, marca, formato, metros, quantidade });

describe("débito da programação", () => {
  it("programado 2.000, lançado 432 → saldo 1.568", () => {
    const { itens } = calcularSaldos(
      [{ id: "1", marca: "Fofopel", formato: "16/4", metros: "30m", quantidade: 2000 }],
      [l("emb1", "Fofopel", "16/4", "30m", 432)],
    );
    expect(itens[0]!.saldo).toBe(1568);
  });
  it("soma lançamentos de turmas diferentes no mesmo dia", () => {
    const { itens } = calcularSaldos(
      [{ id: "1", marca: "Fofopel", formato: "16/4", metros: "30m", quantidade: 2000 }],
      [l("emb1", "Fofopel", "16/4", "30m", 432), l("emb1", " fofopel ", "16/4", "30M", 500)],
    );
    expect(itens[0]!.produzido).toBe(932);
  });
  it("produção sem programação fica fora", () => {
    const { fora } = calcularSaldos([], [l("emb4", "Trópico's", "4/16", "30m", 672)]);
    expect(fora[0]!.quantidade).toBe(672);
  });
});

describe("total do boletim", () => {
  it("soma as 8 linhas (1.357 + rolão 324 + guardanapo 27 = 1.708), sem segunda escolha", () => {
    expect(
      totalBoletim([
        l("segunda", "Higiênico", "", "30M", 50),
        l("emb1", "Trópico's F Dupla", "16/4", "30m", 157),
        l("emb1", "Fofopel", "16/4", "30m", 432),
        l("emb3", "Fofopel", "8/8", "30m", 96),
        l("emb4", "Trópico's", "4/16", "30m", 672),
        l("rolao", "Trópico's", "", "200m", 324),
        l("guardanapo", "Trópico's", "29,5X29,5X50", "", 27),
      ]),
    ).toBe(1708);
  });
});

import { itemEspelhoParaProgramacao } from "./espelho";
describe("espelho da Programação Diária", () => {
  it("100 fardos programados − 30 lançados = saldo 70", () => {
    const p = itemEspelhoParaProgramacao({ id: "x", embaladeira: 1, prioridade: 1, produto: "Fofopel", formato: "16/4", metragem: 30, fardos: 100 });
    const { itens } = calcularSaldos([p], [l("emb1", "Fofopel", "16/4", "30m", 30)]);
    expect(itens[0]!.saldo).toBe(70);
  });
});

import { ordenarPorPrioridade } from "./espelho";
describe("prioridade de fabricação", () => {
  it("ordena 1, 2 e deixa sem prioridade no fim", () => {
    const base = { formato: "", metros: "", quantidade: 1 };
    const r = ordenarPorPrioridade([
      { id: "a", marca: "A", prioridadeFabricacao: null, ...base },
      { id: "b", marca: "B", prioridadeFabricacao: 2, ...base },
      { id: "c", marca: "C", prioridadeFabricacao: 1, ...base },
    ]);
    expect(r.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});
