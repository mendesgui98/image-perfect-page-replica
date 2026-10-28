-- Referência do fabricante e especificação técnica no cadastro de materiais.
-- Texto livre, exibido no cadastro e na busca; não altera preços nem orçamentos.
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS specs text;
COMMENT ON COLUMN public.materials.reference IS 'Fabricante e código de referência (ex.: Clamper Front 175V 45kA - 014294)';
COMMENT ON COLUMN public.materials.specs IS 'Especificação técnica para compra e conferência';
