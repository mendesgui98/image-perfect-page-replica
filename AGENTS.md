<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All price/margin math lives in `src/lib/pricing.ts` (pure, tested in `pricing.test.ts`); UI and PDF only call `computeBudget` — never duplicate formulas.
- Budget items snapshot catalog costs/composition (jsonb `materials`) so catalog edits never silently change existing budgets.
- Cost data access is enforced by RLS via `public.can_see_costs()` (admin/financeiro); roles live in `user_roles`, never on profiles.
- Approved/refused budgets are locked by DB trigger; changes go through `copy_budget(id, true)` revisions.
- Client PDF is an HTML print view (`/orcamentos/$id/pdf`) styled after the client's model; it must never render internal costs/margins.
- Works reference the immutable approved budget; conversion runs atomically through `convert_budget` with a unique budget key to prevent duplicate works.
- Operational quantities and cash/allocations use pure tested helpers in `operations.ts`; economic price/result calculations stay in `pricing.ts`.
- Uploaded evidence and work documents use the private `jmg-documents` bucket and temporary signed URLs; team access is limited to operational records.
- Purchases create commitments atomically; partial receipts determine incurred purchase cost, while settlements affect only cash, never a second expense.
- Contract wording comes from the supplied model; saved bodies are snapshots and signed contracts/approved extras are immutable.
- Unconfirmed completion estimates retain the unregistered original budget cost; never interpret absent estimates as zero remaining cost.
- Work, contract, schedule, diary and extra changes append database audit snapshots in work_history so revisions retain authorship and prior values.
