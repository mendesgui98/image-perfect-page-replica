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
