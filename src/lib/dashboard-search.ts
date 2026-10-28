// Parâmetros de busca (URL) compartilhados pelos painéis.
export type DashboardSearch = {
  period?: string;
  from?: string;
  to?: string;
  work?: string;
  client?: string;
  category?: string;
  status?: string;
  pilot?: boolean;
};
export function dashboardSearch(s: Record<string, unknown>): DashboardSearch {
  return {
    period: typeof s["period"] === "string" ? s["period"] : "todos",
    from: typeof s["from"] === "string" ? s["from"] : "",
    to: typeof s["to"] === "string" ? s["to"] : "",
    work: typeof s["work"] === "string" ? s["work"] : "",
    client: typeof s["client"] === "string" ? s["client"] : "",
    category: typeof s["category"] === "string" ? s["category"] : "",
    status: typeof s["status"] === "string" ? s["status"] : "",
    pilot: s["pilot"] === true || s["pilot"] === "true",
  };
}
