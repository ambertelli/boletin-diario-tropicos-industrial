import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BoletimForm } from "@/components/BoletimForm";
import { HORARIOS, hojeISO, novoBoletimInicial } from "@/lib/producao";

export const Route = createFileRoute("/_authenticated/boletim/novo")({
  validateSearch: z.object({ data: z.string().optional(), horario: z.string().optional() }),
  head: () => ({ meta: [{ title: "Novo boletim – Diário de Produção" }] }),
  component: Novo,
});

function horarioAtual() {
  const h = new Date().getHours();
  return HORARIOS[Math.floor(h / 6)] ?? HORARIOS[0];
}

function Novo() {
  const s = Route.useSearch();
  return <BoletimForm inicial={novoBoletimInicial(s.data ?? hojeISO(), s.horario ?? horarioAtual())} />;
}
