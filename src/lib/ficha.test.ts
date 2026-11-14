import { describe, expect, it } from "vitest";
import { calcularFicha, diasLancamento } from "./ficha";
const l = (data: string, tipo: string, dias: number) => ({ id: data + tipo, data, tipo, periodo: "", dias, descricao: "", boletim_id: null });
describe("ficha", () => {
  it("entrada soma, saída debita férias e faltas acumulam em ordem de data", () => {
    const r = calcularFicha([l("2024-03-01", "F", 1), l("2024-01-01", "E", 20), l("2024-02-01", "S", 15), l("2024-04-01", "F", 2)]);
    expect(r.map((x) => x.saldo)).toEqual([20, 5, 5, 5]);
    expect(r.at(-1)?.acumFaltas).toBe(3);
  });
  it("falta sem dias contabiliza um dia", () => {
    expect(diasLancamento("F", "")).toBe(1);
    expect(calcularFicha([l("2026-11-14", "F", 0)])[0]?.acumFaltas).toBe(1);
  });
  it("preserva a quantidade informada e não cria dias para férias", () => {
    expect(diasLancamento("F", 3)).toBe(3);
    expect(diasLancamento("E", "")).toBe(0);
    expect(diasLancamento("S", 15)).toBe(15);
  });
});
