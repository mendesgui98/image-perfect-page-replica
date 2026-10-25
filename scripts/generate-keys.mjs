// Gera JWT_SECRET, ANON_KEY e SERVICE_ROLE_KEY para o Supabase self-hosted.
// Uso: node scripts/generate-keys.mjs >> infra/.env   (revise o arquivo depois)
import { createHmac, randomBytes } from "node:crypto";

const b64url = (input) => Buffer.from(input).toString("base64url");
const secret = randomBytes(48).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const tenYears = 10 * 365 * 24 * 60 * 60;

function sign(role) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ role, iss: "supabase", iat: now, exp: now + tenYears }));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign("anon")}`);
console.log(`SERVICE_ROLE_KEY=${sign("service_role")}`);
console.log(`POSTGRES_PASSWORD=${randomBytes(24).toString("base64url")}`);
