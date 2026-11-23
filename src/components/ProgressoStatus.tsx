/** Barra de progresso com %: verde quando atingiu a meta, escura enquanto está em andamento. */
export function ProgressoStatus({ programado, produzido }: { programado: number; produzido: number }) {
  const pct = programado ? Math.round((produzido / programado) * 100) : 0;
  const ok = programado > 0 && pct >= 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${ok ? "bg-success" : "bg-foreground"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums">{pct}%</span>
    </div>
  );
}
export const corSaldo = (saldo: number) => (saldo <= 0 ? "text-success" : "text-destructive");
