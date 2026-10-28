import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.ts";

// Verificação do JWT emitido pelo Auth (GoTrue) com o segredo compartilhado (HS256).

export type Claims = {
  sub: string;
  role: string;
  email?: string;
  aal?: "aal1" | "aal2";
  exp: number;
  aud?: string | string[];
  amr?: { method: string }[];
  [key: string]: unknown;
};

const b64urlJson = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

export function verifyJwt(token: string, secret: string, now = Date.now() / 1000): Claims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "invalid_token", "Token inválido");
  const [header, payload, signature] = parts as [string, string, string];
  let head: { alg?: string };
  try {
    head = b64urlJson(header);
  } catch {
    throw new HttpError(401, "invalid_token", "Token inválido");
  }
  if (head.alg !== "HS256") throw new HttpError(401, "invalid_token", "Algoritmo não suportado");
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, "invalid_token", "Assinatura inválida");
  }
  let claims: Claims;
  try {
    claims = b64urlJson(payload);
  } catch {
    throw new HttpError(401, "invalid_token", "Token inválido");
  }
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    throw new HttpError(401, "token_expired", "Sessão expirada");
  }
  if (claims.role !== "authenticated" || !claims.sub) {
    throw new HttpError(401, "invalid_token", "Token não pertence a um usuário");
  }
  return claims;
}

export function bearer(authorization: string | string[] | undefined) {
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  const m = /^Bearer\s+(.+)$/i.exec(value ?? "");
  if (!m?.[1]) throw new HttpError(401, "missing_token", "Faça login para continuar");
  return m[1];
}
