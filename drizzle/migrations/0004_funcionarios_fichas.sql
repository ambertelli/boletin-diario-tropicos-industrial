CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  funcao text NOT NULL DEFAULT '',
  turma text NOT NULL DEFAULT 'A',
  vencimento_ferias date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lideres all func" ON public.funcionarios FOR ALL TO authenticated USING (public.is_lider(auth.uid())) WITH CHECK (public.is_lider(auth.uid()));

CREATE TABLE public.funcionario_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL DEFAULT 'O',
  periodo text NOT NULL DEFAULT '',
  dias numeric NOT NULL DEFAULT 0,
  descricao text NOT NULL DEFAULT '',
  boletim_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.funcionario_lancamentos(funcionario_id, data);
CREATE INDEX ON public.funcionario_lancamentos(boletim_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_lancamentos TO authenticated;
GRANT ALL ON public.funcionario_lancamentos TO service_role;
ALTER TABLE public.funcionario_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lideres all lanc" ON public.funcionario_lancamentos FOR ALL TO authenticated USING (public.is_lider(auth.uid())) WITH CHECK (public.is_lider(auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_ocorrencias_ficha() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o jsonb; f record; txt text;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    DELETE FROM funcionario_lancamentos WHERE boletim_id = OLD.id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  FOR o IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.ocorrencias, '[]'::jsonb)) LOOP
    SELECT id INTO f FROM funcionarios WHERE lower(trim(nome)) = lower(trim(o->>'nome')) LIMIT 1;
    IF f.id IS NOT NULL THEN
      txt := COALESCE(o->>'ocorrencia', '');
      INSERT INTO funcionario_lancamentos(funcionario_id, data, tipo, dias, descricao, boletim_id)
      VALUES (f.id,
        COALESCE(NULLIF(o->>'data','')::date, NEW.data),
        CASE WHEN txt ILIKE '%falta%' THEN 'F' ELSE 'O' END,
        CASE WHEN txt ILIKE '%falta%' THEN 1 ELSE 0 END,
        trim(txt || ' (Boletim turma ' || NEW.turma || ' ' || NEW.horario || COALESCE(' – turno ' || NULLIF(o->>'turno',''), '') || ')'),
        NEW.id);
    END IF;
    f := NULL;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER boletins_sync_ficha AFTER INSERT OR UPDATE OR DELETE ON public.boletins
FOR EACH ROW EXECUTE FUNCTION public.sync_ocorrencias_ficha();