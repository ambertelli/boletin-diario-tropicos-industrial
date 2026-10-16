import { beforeEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (k: string) => mem.get(k),
  set: async (k: string, v: unknown) => { mem.set(k, v); },
}));

import { enfileirar, lerFila, sincronizar } from "./fila";

beforeEach(() => mem.clear());

describe("fila offline", () => {
  it("guarda boletim salvo sem conexão", async () => {
    await enfileirar({ tipo: "salvar", id: "a", payload: { horario: "00-06" } });
    expect(await lerFila()).toHaveLength(1);
  });

  it("mantém só a última versão do mesmo boletim", async () => {
    await enfileirar({ tipo: "salvar", id: "a", payload: { lider: "1" } });
    await enfileirar({ tipo: "salvar", id: "a", payload: { lider: "2" } });
    const f = await lerFila();
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ payload: { lider: "2" } });
  });

  it("envia e remove da fila quando a conexão volta", async () => {
    await enfileirar({ tipo: "salvar", id: "a", payload: {} });
    await enfileirar({ tipo: "salvar", id: "b", payload: {} });
    const n = await sincronizar(async () => ({ ok: true }));
    expect(n).toBe(2);
    expect(await lerFila()).toHaveLength(0);
  });

  it("continua na fila se ainda não houver rede", async () => {
    await enfileirar({ tipo: "salvar", id: "a", payload: {} });
    await sincronizar(async () => ({ ok: false, rede: true, mensagem: "x" }));
    expect(await lerFila()).toHaveLength(1);
  });

  it("descarta e avisa boletim recusado (horário duplicado)", async () => {
    await enfileirar({ tipo: "salvar", id: "a", payload: {} });
    const rej = vi.fn();
    await sincronizar(async () => ({ ok: false, rede: false, mensagem: "dup" }), rej);
    expect(rej).toHaveBeenCalledOnce();
    expect(await lerFila()).toHaveLength(0);
  });
});
