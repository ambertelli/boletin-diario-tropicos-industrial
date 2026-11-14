CREATE OR REPLACE FUNCTION public.normalizar_nome_funcionario(valor text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT regexp_replace(translate(lower(trim(coalesce(valor, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g') $$;
CREATE OR REPLACE FUNCTION public.data_ocorrencia(valor text, padrao date) RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v text := trim(coalesce(valor,'')); partes text[]; ano integer;
BEGIN
 IF v = '' THEN RETURN padrao; END IF;
 IF v ~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN v::date; END IF;
 IF v ~ '^\d{1,2}/\d{1,2}/(\d{2}|\d{4})$' THEN
 partes := string_to_array(v,'/'); ano := partes[3]::integer;
 IF length(partes[3]) = 2 THEN ano := 2000 + ano; END IF;
 RETURN make_date(ano, partes[2]::integer, partes[1]::integer);
 END IF;
 RAISE EXCEPTION 'Data da ocorrência inválida: use DD/MM/AAAA';
END $$;
CREATE OR REPLACE FUNCTION public.sync_ocorrencias_ficha() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o jsonb; fid uuid; ids uuid[]; txt text;
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
 INSERT INTO public.funcionario_lancamentos(funcionario_id,data,tipo,dias,descricao,boletim_id)
 VALUES (fid, public.data_ocorrencia(o->>'data', NEW.data), CASE WHEN txt ILIKE '%falta%' THEN 'F' ELSE 'O' END, CASE WHEN txt ILIKE '%falta%' THEN 1 ELSE 0 END,
 trim(txt || ' (Boletim turma ' || NEW.turma || ' ' || NEW.horario || COALESCE(' – turno ' || NULLIF(o->>'turno',''), '') || ')'), NEW.id);
 END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.normalizar_dias_falta() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.tipo = 'F' AND coalesce(NEW.dias,0) <= 0 THEN NEW.dias := 1; END IF; RETURN NEW; END $$;
CREATE TRIGGER lancamentos_dias_falta BEFORE INSERT OR UPDATE ON public.funcionario_lancamentos FOR EACH ROW EXECUTE FUNCTION public.normalizar_dias_falta();