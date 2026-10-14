CREATE TABLE public.programacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  marca text NOT NULL,
  formato text NOT NULL DEFAULT '',
  metros text NOT NULL DEFAULT '',
  quantidade integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programacao_itens TO authenticated;
GRANT ALL ON public.programacao_itens TO service_role;
ALTER TABLE public.programacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all prog" ON public.programacao_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX ON public.programacao_itens(data);

CREATE TABLE public.boletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  turma text NOT NULL CHECK (turma IN ('A','B','C','D')),
  horario text NOT NULL CHECK (horario IN ('00:00 as 06:00','06:00 as 12:00','12:00 as 18:00','18:00 as 24:00')),
  lider text NOT NULL DEFAULT '',
  producao jsonb NOT NULL DEFAULT '[]',
  paradas jsonb NOT NULL DEFAULT '[]',
  ocorrencias jsonb NOT NULL DEFAULT '[]',
  acidente jsonb NOT NULL DEFAULT '{}',
  observacoes text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data, horario)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletins TO authenticated;
GRANT ALL ON public.boletins TO service_role;
ALTER TABLE public.boletins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all bol" ON public.boletins FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cadastros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('marca','formato','metros')),
  nome text NOT NULL,
  UNIQUE (tipo, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadastros TO authenticated;
GRANT ALL ON public.cadastros TO service_role;
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cad" ON public.cadastros FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.cadastros (tipo, nome) VALUES
('marca','Trópico''s'),('marca','Trópico''s F Dupla'),('marca','Fofopel'),
('formato','16/4'),('formato','4/16'),('formato','8/8'),('formato','12/16'),('formato','29,5X29,5X50'),
('metros','30m'),('metros','200m');