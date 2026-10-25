# Regras do projeto JMG Obras

Desenvolvimento direto pelo GitHub (sem Lovable). Trabalhe em branches e abra PR para a `main`; o CI precisa passar.

## Project rules

- All price/margin math lives in `src/lib/pricing.ts` (pure, tested in `pricing.test.ts`); UI and PDF only call `computeBudget` — never duplicate formulas.
- Budget items snapshot catalog costs/composition (jsonb `materials`) so catalog edits never silently change existing budgets.
- Cost data access is enforced by RLS via `public.can_see_costs()` (admin/financeiro); roles live in `user_roles`, never on profiles.
- Approved/refused budgets are locked by DB trigger; changes go through `copy_budget(id, true)` revisions.
- Client PDF is an HTML print view (`/orcamentos/$id/pdf`) styled after the client's model; it must never render internal costs/margins.
- work_registry is canonical for both origins; linked_budget_id alone references an immutable approved budget. Legacy works mirrors conversion atomically to preserve identifiers; direct works never insert budgets.
- Operational quantities and cash/allocations use pure tested helpers in operations.ts and work-opening.ts; economic price/result calculations stay in pricing.ts.
- Uploaded evidence and work documents use the private `jmg-documents` bucket and temporary signed URLs; team access is limited to operational records.
- Purchases create commitments atomically; partial receipts determine incurred purchase cost, while settlements affect only cash, never a second expense.
- Contract wording comes from the supplied model; saved bodies are snapshots and signed contracts/approved extras are immutable.
- Unconfirmed completion estimates retain the unregistered original budget cost; never interpret absent estimates as zero remaining cost.
- Work, contract, schedule, diary and extra changes append database audit snapshots in work_history so revisions retain authorship and prior values.
- Opening snapshots are immutable and separate from transactions and account balances; direct-work forecasts stay unconfirmed until a completion estimate is entered.
- Financial dashboard aggregation is shared by company and work views; economic results use pricing helpers, and installment payables never add a second purchase expense.
- Form drafts are scoped to the signed-in user and form on the current device; restore installment values but require users to reselect attachments.
- Draft capture and restoration use the shared form-draft helpers, including explicit unchecked values and file exclusion, so forms preserve selections consistently.

- Executive indicators and financial drilldowns use executive.ts compositions from dashboard-data; totals and source rows share one selector to prevent divergence.
- Relationship screens reuse relationship-data queries and navigate to existing work editors; the person profile route is unnested from the directory list to render independently.
- Record deep links use entry/record search parameters and use-record-focus to reveal the source without mutating transactions.

- Work progress/status comparisons live in pure tested work-progress.ts; shared dashboard progress preserves the immutable opening reference until weighted stages exist.
- Stage photos are existing work_records linked by stage_id, protected by same-work validation and private records paths; gallery and reports reuse these rows, so uploads are never duplicated.
- Individual work metrics use work-composition.ts to extend executiveComposition; signed economic breakdowns use the pricing result fields without recomputing economic formulas.
- Schedule headers identify all plans: standalone stages/versions live on schedules/schedule_versions until atomic linking moves stages with stable IDs and preserves immutable versions in work_stages/work_schedule_versions; linked plans always edit work_stages, never a second copy. Removed work stages remain for audit but all operational readers filter them out. Schedule date/status helpers and Gantt are shared with client print views.
