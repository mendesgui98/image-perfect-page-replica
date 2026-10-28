// Leitura de campos de FormData usada pelos formulários.
export const text = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
export const number = (d: FormData, k: string) => Number(d.get(k)) || 0;
