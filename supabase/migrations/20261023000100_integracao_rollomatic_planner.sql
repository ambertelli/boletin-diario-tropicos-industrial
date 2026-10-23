-- Integração Rollomatic Planner no banco do Boletim Diário.
-- Tabelas novas e isoladas: não altera nem apaga boletins, cadastros ou programacao_itens existentes.
CREATE TABLE IF NOT EXISTS public.planner_qualities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  folha text NOT NULL CHECK (folha IN ('simples','dupla')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.planner_reembalagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.planner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embaladeira integer NOT NULL CHECK (embaladeira BETWEEN 1 AND 8),
  name text NOT NULL,
  formato text NOT NULL,
  rolos_por_pacote integer NOT NULL DEFAULT 1 CHECK (rolos_por_pacote > 0),
  pacotes_por_fardo integer NOT NULL DEFAULT 1 CHECK (pacotes_por_fardo > 0),
  metragem integer NOT NULL DEFAULT 0 CHECK (metragem >= 0),
  perfumado boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  emb_impressa_kg_por_fardo numeric(10,3) NOT NULL DEFAULT 0,
  quality_id uuid REFERENCES public.planner_qualities(id) ON DELETE SET NULL,
  reembalagem_id uuid REFERENCES public.planner_reembalagens(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.planner_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_id uuid NOT NULL REFERENCES public.planner_qualities(id) ON DELETE CASCADE,
  metragem integer NOT NULL CHECK (metragem >= 0),
  peso_g_por_rolo numeric(10,2) NOT NULL CHECK (peso_g_por_rolo >= 0),
  UNIQUE (quality_id, metragem)
);
CREATE TABLE IF NOT EXISTS public.planner_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, schedule_date)
);
CREATE TABLE IF NOT EXISTS public.planner_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.planner_schedules(id) ON DELETE CASCADE,
  embaladeira integer NOT NULL CHECK (embaladeira BETWEEN 1 AND 8),
  prioridade integer NOT NULL DEFAULT 1 CHECK (prioridade BETWEEN 1 AND 99),
  product_id uuid REFERENCES public.planner_products(id) ON DELETE SET NULL,
  quality_id uuid REFERENCES public.planner_qualities(id) ON DELETE SET NULL,
  fardos integer NOT NULL DEFAULT 0 CHECK (fardos >= 0),
  reembalagem_id uuid REFERENCES public.planner_reembalagens(id) ON DELETE SET NULL,
  peso_g_override numeric(10,2),
  turno_06_12 integer NOT NULL DEFAULT 0 CHECK (turno_06_12 >= 0),
  turno_12_18 integer NOT NULL DEFAULT 0 CHECK (turno_12_18 >= 0),
  turno_18_00 integer NOT NULL DEFAULT 0 CHECK (turno_18_00 >= 0),
  turno_00_06 integer NOT NULL DEFAULT 0 CHECK (turno_00_06 >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS planner_schedules_date_idx ON public.planner_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS planner_items_schedule_idx ON public.planner_items(schedule_id);
CREATE OR REPLACE FUNCTION public.planner_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS planner_schedules_touch_updated_at ON public.planner_schedules;
CREATE TRIGGER planner_schedules_touch_updated_at BEFORE UPDATE ON public.planner_schedules
FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

ALTER TABLE public.planner_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_reembalagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.planner_qualities, public.planner_reembalagens, public.planner_products, public.planner_weights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_schedules, public.planner_items TO authenticated;
GRANT ALL ON public.planner_qualities, public.planner_reembalagens, public.planner_products, public.planner_weights, public.planner_schedules, public.planner_items TO service_role;

DROP POLICY IF EXISTS "planner authenticated read qualities" ON public.planner_qualities;
CREATE POLICY "planner authenticated read qualities" ON public.planner_qualities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "planner authenticated read reembalagens" ON public.planner_reembalagens;
CREATE POLICY "planner authenticated read reembalagens" ON public.planner_reembalagens FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "planner authenticated read products" ON public.planner_products;
CREATE POLICY "planner authenticated read products" ON public.planner_products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "planner authenticated read weights" ON public.planner_weights;
CREATE POLICY "planner authenticated read weights" ON public.planner_weights FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "planner own schedules" ON public.planner_schedules;
CREATE POLICY "planner own schedules" ON public.planner_schedules FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "planner own items" ON public.planner_items;
CREATE POLICY "planner own items" ON public.planner_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.planner_schedules s WHERE s.id = schedule_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.planner_schedules s WHERE s.id = schedule_id AND s.user_id = auth.uid()));
