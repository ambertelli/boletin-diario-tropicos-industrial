import { somarDias } from "./producao";

export const EMAILS_RH = ["rh@tropicos.ind.br", "conversao@tropicos.ind.br"];

/** Turnos do ciclo 06h de `inicio` até 06h do dia seguinte. */
export function turnosDoCiclo(inicio: string) {
  const fim = somarDias(inicio, 1);
  return [
    { data: inicio, horario: "06:00 as 12:00" },
    { data: inicio, horario: "12:00 as 18:00" },
    { data: inicio, horario: "18:00 as 24:00" },
    { data: fim, horario: "00:00 as 06:00" },
  ];
}

export function noCiclo(b: { data: string; horario: string }, inicio: string) {
  return turnosDoCiclo(inicio).some((t) => t.data === b.data && t.horario === b.horario);
}

/** Hoje em São Paulo (UTC-3). Às 06h05 o ciclo que fechou começou ontem. */
export function cicloQueFechou(agora: Date) {
  const sp = new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  return somarDias(sp, -1);
}
