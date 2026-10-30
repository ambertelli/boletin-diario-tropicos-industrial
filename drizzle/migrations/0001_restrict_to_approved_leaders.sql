DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','lider'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_lider(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('lider','admin'))
$$;

-- existing users keep access
INSERT INTO public.user_roles (user_id, role) SELECT id, 'lider' FROM auth.users ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "auth all bol" ON public.boletins;
CREATE POLICY "lideres all bol" ON public.boletins FOR ALL TO authenticated
  USING (public.is_lider(auth.uid())) WITH CHECK (public.is_lider(auth.uid()));
DROP POLICY IF EXISTS "auth all cad" ON public.cadastros;
CREATE POLICY "lideres all cad" ON public.cadastros FOR ALL TO authenticated
  USING (public.is_lider(auth.uid())) WITH CHECK (public.is_lider(auth.uid()));
DROP POLICY IF EXISTS "auth all prog" ON public.programacao_itens;
CREATE POLICY "lideres all prog" ON public.programacao_itens FOR ALL TO authenticated
  USING (public.is_lider(auth.uid())) WITH CHECK (public.is_lider(auth.uid()));