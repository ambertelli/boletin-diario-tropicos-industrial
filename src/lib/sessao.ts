// Leitura da sessão guardada no aparelho, aceitando-a mesmo vencida.
// Usada só sem internet: a senha não pode ser verificada, mas o líder já entrou antes neste aparelho.
export type SessaoGuardada = { user: { id: string; email?: string }; expires_at?: number };

export function chaveSessao(url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined): string | null {
  if (!url) return null;
  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

export function lerSessaoGuardada(raw: string | null): SessaoGuardada | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    const sess = s?.currentSession ?? s;
    if (sess?.user?.id && sess?.refresh_token) return sess as SessaoGuardada;
  } catch {
    /* ignora */
  }
  return null;
}

export function sessaoGuardada(): SessaoGuardada | null {
  if (typeof window === "undefined") return null;
  const k = chaveSessao();
  if (!k) return null;
  try {
    return lerSessaoGuardada(window.localStorage.getItem(k));
  } catch {
    return null;
  }
}

export function semInternet(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function erroDeRedeAuth(e: { name?: string; status?: number | undefined; message?: string } | null | undefined): boolean {
  if (!e) return false;
  return e.name === "AuthRetryableFetchError" || e.status === 0 || /fetch|network/i.test(e.message ?? "");
}
