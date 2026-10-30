import { supabase } from "@/integrations/supabase/client";

// Cliente da API própria (pasta api/). Envia o token da sessão do Supabase.

const BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

/** A API é opcional durante a transição: sem VITE_API_URL as telas usam o fluxo antigo. */
export const apiConfigured = BASE.length > 0;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function request(path: string, init: RequestInit = {}) {
  if (!apiConfigured) throw new ApiError(0, "api_not_configured", "API não configurada");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(await authHeader()),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(
      res.status,
      body.error ?? "http_error",
      body.message ?? `Erro ${res.status}`,
    );
  }
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  return (await request(path)).json() as Promise<T>;
}

export async function apiSend<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown) {
  const res = await request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Baixa um arquivo gerado pela API (ex.: backup) usando o nome enviado pelo servidor. */
export async function apiDownload(path: string, fallbackName: string) {
  const res = await request(path);
  const name =
    /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gera um arquivo na API (ex.: PDF do orçamento) e devolve o conteúdo com o nome do servidor. */
export async function apiFile(
  method: "GET" | "POST",
  path: string,
  fallbackName: string,
  body?: unknown,
) {
  const res = await request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const name =
    /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  return { name, blob: await res.blob() };
}
