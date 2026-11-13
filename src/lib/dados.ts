import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { somarDias, type Acidente, type ItemProgramacao, type LinhaProducao, type Ocorrencia, type Parada } from "./producao";
import { buscarProgramacaoEspelho, buscarVigencia } from "./espelho.functions";
import { dataCiclo } from "./producao";

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

export const espelhoQuery = (data: string) =>
  queryOptions({
    queryKey: ["programacao-espelho", data],
    queryFn: () => buscarProgramacaoEspelho({ data: { data } }),
  });

/** Programação usada no saldo: a do app Programação Diária quando existir; senão a manual. */
export const programacaoQuery = (data: string) =>
  queryOptions({
    queryKey: ["programacao", data],
    queryFn: async () => {
      try {
        const esp = await buscarProgramacaoEspelho({ data: { data } });
        if (esp.ok && esp.itens.length) return esp.itens.map((i) => ({ ...i, data }));
      } catch { /* sem internet ou sem integração: usa a manual */ }
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

/** Vigência (12h do início até 12h do fim) da programação que contém o dia `ciclo`. */
export const vigenciaQuery = (ciclo: string) =>
  queryOptions({
    queryKey: ["vigencia", ciclo],
    queryFn: async () => {
      try { return await buscarVigencia({ data: { data: ciclo } }); }
      catch { return { inicio: ciclo, fim: somarDias(ciclo, 1) }; }
    },
    staleTime: 5 * 60_000,
  });

/** Boletins de toda a vigência da programação (24h, 48h, 96h...), sempre de 12h a 12h. */
export const boletinsCicloQuery = (ciclo: string) =>
  queryOptions({
    queryKey: ["boletins", "ciclo", ciclo],
    queryFn: async () => {
      const v = await vigenciaQuery(ciclo).queryFn!({} as never);
      const { data: rows, error } = await supabase.from("boletins").select("*")
        .gte("data", v.inicio).lte("data", v.fim).order("data").order("horario");
      if (error) throw error;
      return (rows as unknown as Boletim[]).filter((b) => {
        const c = dataCiclo(b.data, b.horario);
        return c >= v.inicio && c < v.fim;
      });
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
