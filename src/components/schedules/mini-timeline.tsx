import type { DashPayment } from "@/lib/schedule-dashboard";
import { cn } from "@/lib/utils";

// Linha do tempo resumida do card da lista de cronogramas: uma barra por etapa (previsto claro,
// executado escuro pelo avanço), linha de hoje e losangos dos pagamentos, em semanas.

const DAY = 86_400_000;
const t = (d: string) => Date.parse(`${d.slice(0, 10)}T12:00:00Z`);

export function MiniTimeline({
  stages,
  payments,
  today,
}: {
  stages: {
    id: string;
    planned_start: string | null;
    planned_end: string | null;
    progress?: number;
    sort: number;
  }[];
  payments: DashPayment[];
  today: string;
}) {
  const dated = stages.filter((s) => s.planned_start).sort((a, b) => a.sort - b.sort);
  if (!dated.length) return null;
  const s0 = Math.min(...dated.map((s) => t(s.planned_start!)));
  const first = s0 - ((new Date(s0).getUTCDay() + 6) % 7) * DAY;
  const last = Math.max(...dated.map((s) => t(s.planned_end || s.planned_start!))) + DAY;
  const weeks = Math.max(1, Math.ceil((last - first) / (7 * DAY)));
  const span = weeks * 7 * DAY;
  const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - first) / span) * 100));
  const now = t(today);
  const rows = dated.slice(0, 12);
  const mid = Math.max(2, Math.round(weeks / 2));
  return (
    <div className="text-[10px] text-muted-foreground" aria-hidden>
      <div className="mb-1 flex justify-between">
        <span>S1</span>
        {weeks > 3 && <span>S{mid}</span>}
        <span>S{weeks}</span>
      </div>
      <div
        className="relative rounded-md"
        style={{
          backgroundImage: "linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: `${100 / Math.min(weeks, 12)}% 100%`,
        }}
      >
        <div className="space-y-[3px] py-1">
          {rows.map((s) => {
            const left = pos(t(s.planned_start!));
            const right = pos(t(s.planned_end || s.planned_start!) + DAY);
            const done = Math.min(100, Math.max(0, s.progress ?? 0));
            return (
              <div key={s.id} className="relative h-[6px]">
                <span
                  className="absolute inset-y-0 overflow-hidden rounded-full bg-primary/20"
                  style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%` }}
                >
                  <i
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${done}%` }}
                  />
                </span>
              </div>
            );
          })}
        </div>
        {now >= first && now <= first + span && (
          <span
            className="absolute inset-y-0 w-0 border-l-2 border-dashed border-gold"
            style={{ left: `${pos(now)}%` }}
          />
        )}
      </div>
      <div className="relative mt-1 h-3">
        {payments.map((p, i) => (
          <i
            key={i}
            title={p.label}
            className={cn(
              "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45",
              (p.paid ?? 0) >= p.amount - 0.005 ? "bg-positive" : "bg-positive/70",
            )}
            style={{ left: `${pos(t(p.date))}%` }}
          />
        ))}
      </div>
    </div>
  );
}
