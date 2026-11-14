import { describe, expect, it } from "vitest";
import { dataOcorrencia, identificarFuncionario } from "./ocorrencias";

describe("ocorrências do boletim", () => {
  it("aceita datas brasileiras com ano completo", () => {
    expect(dataOcorrencia("14/11/2026", "2026-11-15")).toBe("2026-11-14");
  });
  it("aceita datas brasileiras com ano abreviado", () => {
    expect(dataOcorrencia("14/11/26", "2026-11-15")).toBe("2026-11-14");
  });
  it("usa a data do boletim quando a data da ocorrência está vazia", () => {
    expect(dataOcorrencia("", "2026-11-14")).toBe("2026-11-14");
  });
  it("aceita ISO e rejeita dias inexistentes", () => {
    expect(dataOcorrencia("2026-11-14", "2026-11-15")).toBe("2026-11-14");
    expect(dataOcorrencia("31/02/26", "2026-11-15")).toBeNull();
  });
  it("reconhece nome com acento e espaços, inclusive de outra turma", () => {
    expect(identificarFuncionario(" Fábio  Junior Maceno ", [{ id: "fabio", nome: "Fabio Junior Maceno", turma: "A" }])?.id).toBe("fabio");
  });
  it("não escolhe arbitrariamente entre nomes iguais", () => {
    expect(identificarFuncionario("Fabio", [{id: "1", nome: "Fabio"}, {id: "2", nome: "Fábio"}])).toBeUndefined();
  });
});