-- Rendimento de embalagem: materiais vendidos em embalagem fechada (rolo, saco, lata).
-- Com rendimento preenchido, o orçamento compra embalagens inteiras, arredondando por serviço:
--   embalagens = ceil(qtd × consumo × (1 + perda) ÷ rendimento)
-- Rendimento nulo mantém o cálculo fracionado atual (preço ÷ conversão).
ALTER TABLE public.materials
  ADD COLUMN rendimento_embalagem numeric CHECK (rendimento_embalagem IS NULL OR rendimento_embalagem > 0),
  ADD COLUMN unidade_rendimento text;

COMMENT ON COLUMN public.materials.rendimento_embalagem IS
  'Quanto 1 embalagem rende (ex.: 25 para rolo de 25 m²). Nulo = sem arredondamento por embalagem.';
COMMENT ON COLUMN public.materials.unidade_rendimento IS
  'Unidade do rendimento (ex.: m²). Nulo usa a unidade de consumo.';

-- O vínculo serviço–material já guarda consumo por unidade (consumption) e perda % (loss_pct).
-- Novo vínculo sem consumo informado passa a valer 1 para 1.
ALTER TABLE public.service_materials ALTER COLUMN consumption SET DEFAULT 1;
