import { describe, expect, it } from "vitest";
import { chaveSessao, erroDeRedeAuth, lerSessaoGuardada } from "./sessao";

describe("sessão offline", () => {
  it("aceita sessão guardada mesmo vencida", () => {
    const raw = JSON.stringify({ access_token: "x", refresh_token: "r", expires_at: 1, user: { id: "u1" } });
    expect(lerSessaoGuardada(raw)?.user.id).toBe("u1");
  });

  it("sem sessão guardada volta para o login", () => {
    expect(lerSessaoGuardada(null)).toBeNull();
    expect(lerSessaoGuardada("lixo")).toBeNull();
  });

  it("monta a chave do armazenamento a partir do endereço", () => {
    expect(chaveSessao("https://abc.supabase.co")).toBe("sb-abc-auth-token");
  });

  it("falta de rede não é senha errada", () => {
    expect(erroDeRedeAuth({ name: "AuthRetryableFetchError", status: 0 })).toBe(true);
    expect(erroDeRedeAuth({ name: "AuthApiError", status: 400, message: "Invalid login credentials" })).toBe(false);
  });
});
