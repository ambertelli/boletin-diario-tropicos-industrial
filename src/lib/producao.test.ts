import { describe, it, expect } from "vitest";
import { calcularSaldos, totalBoletim, type LinhaProducao } from "./producao";

const l = (secao: LinhaProducao["secao"], marca: string, formato: string, metros: string, quantidade: number): LinhaProducao => ({ secao, marca, formato, metros, quantidade });

describe("débito da programação", () => {
  it("programado 2.000, lançado 432 → saldo 1.568", () => {
    const { itens } = calcularSaldos(
      [{ id: "1", marca: "Fofopel", formato: "16/4", metros: "30m", quantidade: 2000 }],
      [l("emb1", "Fofopel", "16/4", "30m", 432)],
    );
    expect(itens[0].saldo).toBe(1568);
  });
  it("soma lançamentos de turmas diferentes no mesmo dia", () => {
    const { itens } = calcularSaldos(
      [{ id: "1", marca: "Fofopel", formato: "16/4", metros: "30m", quantidade: 2000 }],
      [l("emb1", "Fofopel", "16/4", "30m", 432), l("emb1", " fofopel ", "16/4", "30M", 500)],
    );
    expect(itens[0].produzido).toBe(932);
  });
  it("produção sem programação fica fora", () => {
    const { fora } = calcularSaldos([], [l("emb4", "Trópico's", "4/16", "30m", 672)]);
    expect(fora[0].quantidade).toBe(672);
  });
});

describe("total do boletim", () => {
  it("modelo 13/10 turma D soma 1.357 só nas embaladeiras", () => {
    expect(
      totalBoletim([
        l("emb1", "Trópico's F Dupla", "16/4", "30m", 157),
        l("emb1", "Fofopel", "16/4", "30m", 432),
        l("emb3", "Fofopel", "8/8", "30m", 96),
        l("emb4", "Trópico's", "4/16", "30m", 672),
        l("rolao", "Trópico's", "", "200m", 324),
        l("guardanapo", "Trópico's", "29,5X29,5X50", "", 27),
      ]),
    ).toBe(1357);
  });
});
