import type { Db } from "./db.ts";

// Consultas SQL da API. Mantidas aqui para os handlers ficarem testáveis com um repositório falso.

export const ROLES = ["admin", "financeiro", "equipe"] as const;
export type Role = (typeof ROLES)[number];

export type UserSummary = {
  id: string;
  email: string;
  full_name: string | null;
  roles: Role[];
  mfa: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmed: boolean;
};

export type Repo = {
  ping(): Promise<boolean>;
  rolesOf(userId: string): Promise<Role[]>;
  hasVerifiedFactor(userId: string): Promise<boolean>;
  listUsers(): Promise<UserSummary[]>;
  setRoles(userId: string, roles: Role[]): Promise<void>;
  countAdmins(): Promise<number>;
  exportTables(): Promise<Record<string, unknown[]>>;
};

export function createRepo(db: Db): Repo {
  const { sql } = db;
  return {
    ping: () => db.ping(),
    async rolesOf(userId) {
      const rows =
        await sql`select role::text as role from public.user_roles where user_id = ${userId}`;
      return rows.map((r) => r["role"] as Role);
    },
    async hasVerifiedFactor(userId) {
      const [row] = await sql`
        select exists(
          select 1 from auth.mfa_factors where user_id = ${userId} and status = 'verified'
        ) as has`;
      return row?.["has"] === true;
    },
    async listUsers() {
      const rows = await sql`
        select u.id, u.email, p.full_name, u.created_at, u.last_sign_in_at, u.invited_at,
               (u.email_confirmed_at is not null) as confirmed,
               coalesce(array_agg(r.role::text order by r.role) filter (where r.role is not null), '{}') as roles,
               exists(select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified') as mfa
        from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.user_roles r on r.user_id = u.id
        group by u.id, p.full_name
        order by u.created_at`;
      return rows as unknown as UserSummary[];
    },
    async setRoles(userId, roles) {
      await sql.begin(async (tx) => {
        await tx`delete from public.user_roles where user_id = ${userId}`;
        for (const role of roles) {
          await tx`insert into public.user_roles (user_id, role) values (${userId}, ${role})`;
        }
      });
    },
    async countAdmins() {
      const [row] =
        await sql`select count(*)::int as n from public.user_roles where role = 'admin'`;
      return Number(row?.["n"] ?? 0);
    },
    async exportTables() {
      const tables = await sql`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`;
      const out: Record<string, unknown[]> = {};
      for (const t of tables) {
        const name = String(t["table_name"]);
        out[name] = [...(await sql`select * from ${sql("public." + name)}`)];
      }
      return out;
    },
  };
}
