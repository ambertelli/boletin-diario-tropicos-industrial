import { useEffect, useState } from "react";
import { ouvirFila } from "@/lib/fila";

export function StatusConexao() {
  const [online, setOnline] = useState(true);
  const [pend, setPend] = useState(0);
  const [sync, setSync] = useState(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const un = ouvirFila((n, s) => { setPend(n); setSync(s); });
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); un(); };
  }, []);

  if (online && !pend && !sync) return null;
  const txt = !online
    ? `Sem conexão${pend ? ` – ${pend} boletim(ns) aguardando envio` : " – trabalhando com dados guardados no aparelho"}`
    : sync ? "Sincronizando..." : `${pend} boletim(ns) aguardando envio`;
  return (
    <div className={`no-print px-4 py-1.5 text-center text-sm font-medium ${online ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"}`}>
      {txt}
    </div>
  );
}
