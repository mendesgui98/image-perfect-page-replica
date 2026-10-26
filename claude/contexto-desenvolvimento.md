# Contexto de desenvolvimento

Registro das tasks feitas pelo Claude neste repositório. Regras gerais do projeto ficam em `AGENTS.md`.

## Tasks concluídas

### 2026-10-25 — Rendimento de embalagem dos materiais (branch `feat/fundacao-tecnica`)

**Problema:** material vendido em embalagem (ex.: salva-piso em rolo de 25 m²) era cobrado 1 unidade de compra por unidade de serviço quando a conversão ficava no padrão 1 — 100 m² de proteção viravam 100 rolos.

**Decisões:**

- O vínculo `service_materials` já tinha `consumption` (consumo por unidade) e `loss_pct` (perda %). Por decisão do Guilherme, **reaproveitamos essas colunas** em vez de criar `consumo_por_unidade`/`perda_percentual` duplicadas. O default de `consumption` passou de 0 para 1.
- `materials` ganhou `rendimento_embalagem` (numeric, nulo, > 0) e `unidade_rendimento` (text, nulo — usa a unidade de consumo quando vazio).
- **Arredondamento por serviço** (decisão do Guilherme): `embalagens = ⌈qtd × consumo × (1 + perda/100) ÷ rendimento⌉`, `custo = embalagens × preço da embalagem`. Dois serviços de 30 m² dão 2 + 2 rolos, não 3.
- Rendimento nulo mantém o cálculo antigo (fracionado por `conversion`), então orçamentos existentes não mudam.

**Onde está:**

- Migração: `supabase/migrations/20261025000002_material_package_yield.sql`.
- Cálculo: `src/lib/pricing.ts` — `materialPackages`, `materialPurchaseQty`, `materialCost`. Testes em `pricing.test.ts` (100 m² → 4, 30 m² → 2, 100 m² + 10% → 5, arredondamento por serviço, sem rendimento).
- Snapshot do item (`budget_items.materials`): campos `package_yield` e `yield_unit`, copiados do catálogo ao adicionar o serviço ao orçamento.
- UI: campos no cadastro de material (`materiais.tsx`); exemplo "100 m² → N rolos" na composição do serviço (`servicos.tsx`); linha do item mostra "100 m² → 4 rolo" (`items-editor.tsx`); resumo de materiais e consolidação de compras (`operations.ts`) somam as embalagens por serviço.

**Pendências:**

- Migração não aplicada em banco local nesta sessão (Docker indisponível no PATH). Rodar `npm run stack:up` / `npm run db:migrate` para conferir.
- Itens de orçamento já criados não recebem o rendimento retroativamente (é snapshot); para aplicar, readicionar o serviço ao orçamento.
