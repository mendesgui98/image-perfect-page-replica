// Gera JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY e POSTGRES_PASSWORD.
// Normalmente não é preciso rodar: `bun run stack:up` preenche o infra/.env sozinho.
import { generateSecrets } from "./lib/secrets.mjs";

for (const [key, value] of Object.entries(generateSecrets())) console.log(`${key}=${value}`);
