import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { bearer, verifyJwt, type Claims } from "./auth.ts";
import type { AuthAdmin } from "./gotrue.ts";
import { HttpError, Router, json, readJson, send, type Request } from "./http.ts";
import { ROLES, type Repo, type Role } from "./repo.ts";

export type Deps = {
  jwtSecret: string;
  siteUrl: string;
  corsOrigins: string[];
  repo: Repo;
  authAdmin: AuthAdmin;
  log?: (entry: Record<string, unknown>) => void;
};

type Session = { claims: Claims; roles: Role[] };

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  full_name: z.string().trim().max(120).optional(),
  role: z.enum(ROLES),
});
const rolesSchema = z.object({ roles: z.array(z.enum(ROLES)).max(3) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new HttpError(400, "invalid_body", r.error.issues.map((i) => i.message).join("; "));
  }
  return r.data;
}

export function createApp(deps: Deps) {
  const log = deps.log ?? ((e) => console.log(JSON.stringify(e)));

  async function session(req: Request): Promise<Session> {
    const claims = verifyJwt(bearer(req.headers.authorization), deps.jwtSecret);
    return { claims, roles: await deps.repo.rolesOf(claims.sub) };
  }

  /** Admin com 2FA: quem já cadastrou o segundo fator precisa estar em aal2. */
  async function admin(req: Request): Promise<Session> {
    const s = await session(req);
    if (!s.roles.includes("admin")) {
      throw new HttpError(403, "forbidden", "Acesso restrito a administradores");
    }
    if (s.claims.aal !== "aal2" && (await deps.repo.hasVerifiedFactor(s.claims.sub))) {
      throw new HttpError(403, "mfa_required", "Confirme o segundo fator de autenticação");
    }
    return s;
  }

  const router = new Router()
    .add("GET", "/health", async () => {
      const db = await deps.repo.ping().catch(() => false);
      return json(db ? 200 : 503, { status: db ? "ok" : "degraded", db });
    })
    .add("GET", "/v1/me", async (req) => {
      const s = await session(req);
      return json(200, {
        id: s.claims.sub,
        email: s.claims.email ?? null,
        roles: s.roles,
        aal: s.claims.aal ?? "aal1",
      });
    })
    .add("GET", "/v1/admin/users", async (req) => {
      await admin(req);
      return json(200, { users: await deps.repo.listUsers() });
    })
    .add("POST", "/v1/admin/invites", async (req) => {
      const s = await admin(req);
      const body = parse(inviteSchema, await req.body());
      const user = await deps.authAdmin.invite(
        body.email,
        body.full_name ? { full_name: body.full_name } : {},
        `${deps.siteUrl}/reset-password`,
      );
      await deps.repo.setRoles(user.id, [body.role]);
      log({ event: "invite", by: s.claims.sub, user: user.id, role: body.role });
      return json(201, { user });
    })
    .add("PUT", "/v1/admin/users/:id/roles", async (req) => {
      const s = await admin(req);
      const { roles } = parse(rolesSchema, await req.body());
      const target = req.params["id"] ?? "";
      if (target === s.claims.sub && !roles.includes("admin")) {
        throw new HttpError(
          409,
          "self_demotion",
          "Você não pode remover seu próprio acesso de administrador",
        );
      }
      const current = await deps.repo.rolesOf(target);
      if (
        current.includes("admin") &&
        !roles.includes("admin") &&
        (await deps.repo.countAdmins()) <= 1
      ) {
        throw new HttpError(409, "last_admin", "O sistema precisa de pelo menos um administrador");
      }
      await deps.repo.setRoles(target, [...new Set(roles)]);
      log({ event: "roles", by: s.claims.sub, user: target, roles });
      return json(200, { id: target, roles });
    })
    .add("GET", "/v1/admin/export", async (req) => {
      const s = await admin(req);
      const tables = await deps.repo.exportTables();
      log({ event: "export", by: s.claims.sub });
      const stamp = new Date().toISOString().slice(0, 10);
      return {
        status: 200,
        body: { exported_at: new Date().toISOString(), tables },
        headers: { "content-disposition": `attachment; filename="jmg-backup-${stamp}.json"` },
      };
    });

  function corsHeaders(origin: string | undefined): Record<string, string> {
    const base: Record<string, string> = { vary: "origin", "x-content-type-options": "nosniff" };
    if (!origin || !deps.corsOrigins.includes(origin.replace(/\/+$/, ""))) return base;
    return {
      ...base,
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-max-age": "600",
      "access-control-expose-headers": "content-disposition",
    };
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const started = Date.now();
    const url = new URL(req.url ?? "/", "http://api");
    const headers = corsHeaders(req.headers.origin);
    const method = req.method ?? "GET";
    let status = 500;
    try {
      if (method === "OPTIONS") {
        status = 204;
        return send(res, { status }, headers);
      }
      const found = router.match(method, url.pathname);
      if (!found) throw new HttpError(404, "not_found", "Rota não encontrada");
      const reply = await found.handler({
        method,
        path: url.pathname,
        params: found.params,
        query: url.searchParams,
        headers: req.headers,
        body: () => readJson(req),
      });
      status = reply.status;
      send(res, reply, headers);
    } catch (error) {
      const known = error instanceof HttpError;
      status = known ? error.status : 500;
      if (!known) log({ level: "error", path: url.pathname, error: String(error) });
      send(
        res,
        json(status, {
          error: known ? error.code : "internal_error",
          message: known ? error.message : "Erro interno",
        }),
        headers,
      );
    } finally {
      if (url.pathname !== "/health") {
        log({ method, path: url.pathname, status, ms: Date.now() - started });
      }
    }
  };
}
