import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb } from "./db.ts";
import { createAuthAdmin } from "./gotrue.ts";
import { createPdfService } from "./pdf/index.ts";
import { closeBrowser } from "./pdf/render.ts";
import { createRepo } from "./repo.ts";

const config = loadConfig();
const db = createDb(config.databaseUrl);
const app = createApp({
  jwtSecret: config.jwtSecret,
  siteUrl: config.siteUrl,
  corsOrigins: config.corsOrigins,
  repo: createRepo(db),
  authAdmin: createAuthAdmin(config.authUrl, config.serviceRoleKey),
  pdf: createPdfService(),
});

const server = createServer((req, res) => void app(req, res));
server.listen(config.port, () => {
  console.log(JSON.stringify({ event: "listening", port: config.port }));
});

function shutdown() {
  server.close(() => void Promise.all([db.close(), closeBrowser()]).finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
