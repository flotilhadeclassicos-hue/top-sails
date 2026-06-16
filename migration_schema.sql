-- ============================================================
-- Top Sails — Schema Migration
-- Rodar no SQL Editor do novo projeto Supabase
-- ============================================================

-- 1. Tabela principal
CREATE TABLE IF NOT EXISTS public.kv_store (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Função de trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.kv_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS kv_updated_at_trigger ON public.kv_store;
CREATE TRIGGER kv_updated_at_trigger
  BEFORE UPDATE ON public.kv_store
  FOR EACH ROW EXECUTE FUNCTION public.kv_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS allow_all ON public.kv_store;
DROP POLICY IF EXISTS autenticados_leitura ON public.kv_store;
DROP POLICY IF EXISTS autenticados_escrita ON public.kv_store;

CREATE POLICY allow_all ON public.kv_store FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY autenticados_leitura ON public.kv_store FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY autenticados_escrita ON public.kv_store FOR ALL USING (auth.uid() IS NOT NULL);
