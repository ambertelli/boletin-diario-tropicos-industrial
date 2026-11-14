export type Lancamento = { id: string; data: string; tipo: string; periodo: string; dias: number; descricao: string; boletim_id: string | null };
export type LinhaFicha = Lancamento & { saldo: number; faltas: number; acumFaltas: number };

/** E = entrada (crédito de férias), S = saída (férias gozadas), F = falta, O = outra ocorrência. */
export const TIPOS_LANC = [["E", "E – Entrada férias"], ["S", "S – Saída férias"], ["F", "Falta"], ["O", "Outra ocorrência"]] as const;

export function diasLancamento(tipo: string, valor: string | number) {
  const dias = Number(valor) || 0;
  return tipo === "F" && dias <= 0 ? 1 : dias;
}

export function calcularFicha(lancs: Lancamento[]): LinhaFicha[] {
  const ord = [...lancs].sort((a, b) => a.data.localeCompare(b.data));
  let saldo = 0, acum = 0;
  return ord.map((l) => {
    const d = diasLancamento(l.tipo, l.dias);
    if (l.tipo === "E") saldo += d;
    if (l.tipo === "S") saldo -= d;
    const faltas = l.tipo === "F" ? d : 0;
    acum += faltas;
    return { ...l, saldo, faltas, acumFaltas: acum };
  });
}
