import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb } from "./db.ts";
import { createAuthAdmin } from "./gotrue.ts";
import { createRepo } from "./repo.ts";

const config = loadConfig();
const db = createDb(config.databaseUrl);
const app = createApp({
  jwtSecret: config.jwtSecret,
  siteUrl: config.siteUrl,
  corsOrigins: config.corsOrigins,
  repo: createRepo(db),
  authAdmin: createAuthAdmin(config.authUrl, config.serviceRoleKey),
});

const server = createServer((req, res) => void app(req, res));
server.listen(config.port, () => {
  console.log(JSON.stringify({ event: "listening", port: config.port }));
});

function shutdown() {
  server.close(() => void db.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
