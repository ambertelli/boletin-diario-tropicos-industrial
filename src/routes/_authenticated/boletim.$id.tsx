import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BoletimForm } from "@/components/BoletimForm";
import { boletimQuery } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/boletim/$id")({
  head: () => ({ meta: [{ title: "Boletim – Diário de Produção" }] }),
  component: Editar,
});

function Editar() {
  const { id } = Route.useParams();
  const q = useQuery(boletimQuery(id));
  if (q.isLoading) return <p>Carregando...</p>;
  if (!q.data) return <p>Boletim não encontrado.</p>;
  const { id: _, ...rest } = q.data;
  return <BoletimForm key={id + q.dataUpdatedAt} id={id} inicial={rest} />;
}
