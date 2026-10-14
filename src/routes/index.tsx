import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diário de Produção – Trópico's" },
      { name: "description", content: "Boletim de conversão por turno A, B, C e D integrado à programação diária." },
      { property: "og:title", content: "Diário de Produção – Trópico's" },
      { property: "og:description", content: "Boletim de conversão por turno integrado à programação diária." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
