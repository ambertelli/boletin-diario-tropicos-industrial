CREATE OR REPLACE FUNCTION public.sync_ocorrencias_ficha() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o jsonb; fid uuid; ids uuid[]; txt text; d numeric;
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN DELETE FROM public.funcionario_lancamentos WHERE boletim_id = OLD.id; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 FOR o IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.ocorrencias, '[]'::jsonb)) LOOP
  fid := NULL;
  IF coalesce(o->>'funcionario_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   SELECT id INTO fid FROM public.funcionarios WHERE id = (o->>'funcionario_id')::uuid;
  ELSE
   SELECT array_agg(id) INTO ids FROM public.funcionarios WHERE public.normalizar_nome_funcionario(nome) = public.normalizar_nome_funcionario(o->>'nome');
   IF cardinality(ids) = 1 THEN fid := ids[1]; END IF;
  END IF;
  IF fid IS NOT NULL THEN
   txt := COALESCE(o->>'ocorrencia', '');
   d := CASE WHEN replace(coalesce(o->>'dias',''), ',', '.') ~ '^\d+(\.\d+)?$' THEN replace(o->>'dias', ',', '.')::numeric ELSE NULL END;
   INSERT INTO public.funcionario_lancamentos(funcionario_id,data,tipo,dias,descricao,boletim_id)
   VALUES (fid, public.data_ocorrencia(o->>'data', NEW.data), CASE WHEN txt ILIKE '%falta%' THEN 'F' ELSE 'O' END,
    COALESCE(d, CASE WHEN txt ILIKE '%falta%' THEN 1 ELSE 0 END),
    trim(txt || ' (Boletim turma ' || NEW.turma || ' ' || NEW.horario || COALESCE(' – turno ' || NULLIF(o->>'turno',''), '') || ')'), NEW.id);
  END IF;
 END LOOP;
 RETURN NEW;
END $$;