// Configuração lida do ambiente. Falha cedo quando falta algo obrigatório.
export type Config = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  authUrl: string;
  serviceRoleKey: string;
  siteUrl: string;
  corsOrigins: string[];
};

function required(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const siteUrl = required(env, "SITE_URL").replace(/\/+$/, "");
  return {
    port: Number(env["PORT"] ?? 4000),
    databaseUrl: required(env, "DATABASE_URL"),
    jwtSecret: required(env, "JWT_SECRET"),
    // Endereço interno do serviço de Auth (GoTrue), ex.: http://auth:9999
    authUrl: required(env, "AUTH_URL").replace(/\/+$/, ""),
    serviceRoleKey: required(env, "SERVICE_ROLE_KEY"),
    siteUrl,
    corsOrigins: (env["CORS_ORIGINS"] ?? siteUrl)
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  };
}
