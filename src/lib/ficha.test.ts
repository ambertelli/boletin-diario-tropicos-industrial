import { describe, expect, it } from "vitest";
import { calcularFicha } from "./ficha";
const l = (data: string, tipo: string, dias: number) => ({ id: data + tipo, data, tipo, periodo: "", dias, descricao: "", boletim_id: null });
describe("ficha", () => {
  it("entrada soma, saída debita férias e faltas acumulam em ordem de data", () => {
    const r = calcularFicha([l("2024-03-01", "F", 1), l("2024-01-01", "E", 20), l("2024-02-01", "S", 15), l("2024-04-01", "F", 2)]);
    expect(r.map((x) => x.saldo)).toEqual([20, 5, 5, 5]);
    expect(r.at(-1)!.acumFaltas).toBe(3);
  });
});
