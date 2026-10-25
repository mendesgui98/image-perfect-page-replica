import { createHmac, randomBytes } from "node:crypto";

// Segredos do Supabase self-hosted: JWT_SECRET, chaves anon/service_role e senha do banco.
export function generateSecrets() {
  const b64url = (input) => Buffer.from(input).toString("base64url");
  const secret = randomBytes(48).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const tenYears = 10 * 365 * 24 * 60 * 60;
  const sign = (role) => {
    const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = b64url(
      JSON.stringify({ role, iss: "supabase", iat: now, exp: now + tenYears }),
    );
    const signature = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");
    return `${header}.${payload}.${signature}`;
  };
  return {
    JWT_SECRET: secret,
    ANON_KEY: sign("anon"),
    SERVICE_ROLE_KEY: sign("service_role"),
    POSTGRES_PASSWORD: randomBytes(24).toString("base64url"),
  };
}
