-- Publica a programação Rollomatic no saldo usado pelo Boletim Diário.
-- A coluna é opcional e NULL nas linhas antigas: os registros existentes são preservados.
ALTER TABLE public.programacao_itens
  ADD COLUMN IF NOT EXISTS planner_sync_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.programacao_itens'::regclass
      AND conname = 'programacao_itens_planner_sync_key_key'
  ) THEN
    ALTER TABLE public.programacao_itens
      ADD CONSTRAINT programacao_itens_planner_sync_key_key UNIQUE (planner_sync_key);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_planner_to_programacao(p_data date)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_count integer := 0;
BEGIN
  SELECT s.id INTO v_schedule_id
  FROM public.planner_schedules s
  WHERE s.user_id = auth.uid() AND s.schedule_date = p_data;

  IF v_schedule_id IS NULL THEN
    RAISE EXCEPTION 'Não existe programação avançada para esta data e usuário.';
  END IF;

  -- Não sobrescreve silenciosamente programação manual antiga.
  IF EXISTS (
    SELECT 1
    FROM public.planner_items i
    JOIN public.planner_products p ON p.id = i.product_id
    JOIN public.programacao_itens old
      ON old.data = p_data
     AND lower(trim(coalesce(old.marca, ''))) = lower(trim(p.name))
     AND lower(trim(coalesce(old.formato, ''))) = lower(trim(p.formato))
     AND trim(coalesce(old.metros::text, '')) = p.metragem::text
     AND old.planner_sync_key IS NULL
    WHERE i.schedule_id = v_schedule_id
  ) THEN
    RAISE EXCEPTION 'Já existe programação manual para um produto desta data. Revise a programação diária antes de publicar para evitar duplicidade.';
  END IF;

  -- Remove somente linhas publicadas anteriormente por esta integração que deixaram de existir.
  DELETE FROM public.programacao_itens old
  WHERE old.planner_sync_key LIKE ('rollomatic:' || p_data::text || ':%')
    AND NOT EXISTS (
      SELECT 1
      FROM public.planner_items i
      JOIN public.planner_products p ON p.id = i.product_id
      WHERE i.schedule_id = v_schedule_id
        AND old.planner_sync_key = 'rollomatic:' || p_data::text || ':' || p.id::text
    );

  INSERT INTO public.programacao_itens
    (data, marca, formato, metros, quantidade, planner_sync_key)
  SELECT
    p_data,
    p.name,
    p.formato,
    p.metragem::text,
    sum(i.fardos)::integer,
    'rollomatic:' || p_data::text || ':' || p.id::text
  FROM public.planner_items i
  JOIN public.planner_products p ON p.id = i.product_id
  WHERE i.schedule_id = v_schedule_id
  GROUP BY p.id, p.name, p.formato, p.metragem
  ON CONFLICT (planner_sync_key) DO UPDATE
    SET data = EXCLUDED.data,
        marca = EXCLUDED.marca,
        formato = EXCLUDED.formato,
        metros = EXCLUDED.metros,
        quantidade = EXCLUDED.quantidade;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_planner_to_programacao(date) TO authenticated;
