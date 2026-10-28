import { budgetApi } from "@/lib/budget-api";
import type { Section } from "@/lib/budget-data";
import { commitOnEnter } from "@/lib/enter-submit";
import { stageWeeks } from "@/lib/proposal";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback";
import { cn } from "@/lib/utils";

// Cronograma estimado do PDF: cada etapa do orçamento (na ordem) com semana de início e duração.
// Campos vazios seguem a regra de stageWeeks (começa depois da anterior e dura 1 semana).

export function ScheduleEditor({
  sections,
  locked,
  onChange,
}: {
  sections: Section[];
  locked: boolean;
  onChange: () => void;
}) {
  const weeks = stageWeeks(sections);
  const total = Math.max(0, ...weeks.map((w) => w.startWeek + w.weeks - 1));
  const save = (id: string, patch: Record<string, unknown>) =>
    budgetApi
      .updateSection(id, patch)
      .then(onChange)
      .catch((e: Error) => toast.error(e.message));
  const weekValue = (v: string) => (v.trim() ? Math.max(1, Math.round(Number(v)) || 1) : null);

  if (!sections.length)
    return (
      <EmptyState
        title="Sem etapas"
        description="Inclua etapas na aba Serviços para montar o cronograma."
      />
    );
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div>
          <h3 className="text-base font-semibold">Cronograma estimado</h3>
          <p className="text-sm text-muted-foreground">
            Duração total: <b className="text-foreground num">{total}</b>{" "}
            {total === 1 ? "semana" : "semanas"}. Vazio = a etapa começa depois da anterior e dura 1
            semana. No PDF entra a ressalva de que o cronograma é uma estimativa.
          </p>
        </div>
        <div className="space-y-3">
          {sections.map((s, i) => {
            const w = weeks[i]!;
            return (
              <div key={s.id} className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
                      i % 2 === 0 ? "bg-primary" : "bg-primary/70",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_120px]">
                  <Input
                    aria-label={`Descrição curta da etapa ${s.title}`}
                    placeholder="Descrição curta (aparece no PDF)"
                    className="col-span-2 sm:col-span-1"
                    defaultValue={s.description ?? ""}
                    disabled={locked}
                    onKeyDown={commitOnEnter}
                    onBlur={(e) =>
                      e.target.value.trim() !== (s.description ?? "") &&
                      save(s.id, { description: e.target.value.trim() || null })
                    }
                  />
                  <label className="space-y-0.5 text-xs text-muted-foreground">
                    Semana de início
                    <Input
                      type="number"
                      min={1}
                      placeholder={String(w.startWeek)}
                      defaultValue={s.start_week ?? ""}
                      disabled={locked}
                      onKeyDown={commitOnEnter}
                      onBlur={(e) =>
                        weekValue(e.target.value) !== s.start_week &&
                        save(s.id, { start_week: weekValue(e.target.value) })
                      }
                    />
                  </label>
                  <label className="space-y-0.5 text-xs text-muted-foreground">
                    Duração (semanas)
                    <Input
                      type="number"
                      min={1}
                      placeholder={String(w.weeks)}
                      defaultValue={s.duration_weeks ?? ""}
                      disabled={locked}
                      onKeyDown={commitOnEnter}
                      onBlur={(e) =>
                        weekValue(e.target.value) !== s.duration_weeks &&
                        save(s.id, { duration_weeks: weekValue(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <div
                  className="mt-3 grid h-2.5 gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, minmax(0, 1fr))` }}
                  aria-hidden
                >
                  <span
                    className={cn("rounded-full", i % 2 === 0 ? "bg-primary" : "bg-primary/60")}
                    style={{ gridColumn: `${w.startWeek} / span ${w.weeks}` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
