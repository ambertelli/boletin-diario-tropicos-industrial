import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Acidente, ItemProgramacao, LinhaProducao, Ocorrencia, Parada } from "./producao";

export type Boletim = {
  id: string;
  data: string;
  turma: string;
  horario: string;
  lider: string;
  producao: LinhaProducao[];
  paradas: Parada[];
  ocorrencias: Ocorrencia[];
  acidente: Acidente;
  observacoes: string;
};

export const programacaoQuery = (data: string) =>
  queryOptions({
    queryKey: ["programacao", data],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("programacao_itens").select("*").eq("data", data).order("created_at");
      if (error) throw error;
      return rows as (ItemProgramacao & { data: string })[];
    },
  });

export const boletinsDiaQuery = (data: string) =>
  queryOptions({
    queryKey: ["boletins", "dia", data],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("boletins").select("*").eq("data", data).order("horario");
      if (error) throw error;
      return rows as unknown as Boletim[];
    },
  });

export const boletinsMesQuery = (data: string) =>
  queryOptions({
    queryKey: ["boletins", "mes", data.slice(0, 7)],
    queryFn: async () => {
      const ini = data.slice(0, 7) + "-01";
      const [y, m] = data.split("-").map(Number);
      const fim = new Date(y!, m!, 0).getDate();
      const { data: rows, error } = await supabase
        .from("boletins").select("id,data,turma,horario,lider,producao")
        .gte("data", ini).lte("data", `${data.slice(0, 7)}-${String(fim).padStart(2, "0")}`)
        .order("data", { ascending: false }).order("horario");
      if (error) throw error;
      return rows as unknown as Boletim[];
    },
  });

export const boletimQuery = (id: string) =>
  queryOptions({
    queryKey: ["boletim", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boletins").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Boletim;
    },
  });

export const cadastrosQuery = queryOptions({
  queryKey: ["cadastros"],
  queryFn: async () => {
    const { data, error } = await supabase.from("cadastros").select("*").order("nome");
    if (error) throw error;
    return data;
  },
});
