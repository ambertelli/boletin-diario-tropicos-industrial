import { describe, it, expect } from "vitest";
import { noCiclo, cicloQueFechou } from "./relatorio-rh";

describe("relatório RH 06h-06h", () => {
  it("inclui 06-12 do dia e 00-06 do dia seguinte", () => {
    expect(noCiclo({ data: "2026-11-18", horario: "06:00 as 12:00" }, "2026-11-18")).toBe(true);
    expect(noCiclo({ data: "2026-11-19", horario: "00:00 as 06:00" }, "2026-11-18")).toBe(true);
  });
  it("exclui 00-06 do próprio dia", () => {
    expect(noCiclo({ data: "2026-11-18", horario: "00:00 as 06:00" }, "2026-11-18")).toBe(false);
  });
  it("às 06h05 de 19/11 (SP) envia o ciclo de 18/11", () => {
    expect(cicloQueFechou(new Date("2026-11-19T09:05:00Z"))).toBe("2026-11-18");
  });
});
