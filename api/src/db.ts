import postgres from "postgres";
import type { Claims } from "./auth.ts";

export type Sql = postgres.Sql | postgres.TransactionSql;

export type Db = {
  /** Conexão privilegiada: use só depois de checar a autorização no código. */
  sql: postgres.Sql;
  /**
   * Executa como o usuário da requisição: papel `authenticated` + claims do JWT.
   * As mesmas políticas RLS do app valem aqui, sem duplicar regras.
   */
  asUser<T>(claims: Claims, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
};

export function createDb(url: string): Db {
  const sql = postgres(url, { max: 10, idle_timeout: 30, onnotice: () => {} });
  return {
    sql,
    asUser: (claims, fn) =>
      sql.begin(async (tx) => {
        await tx`select
          set_config('request.jwt.claims', ${JSON.stringify(claims)}, true),
          set_config('request.jwt.claim.sub', ${claims.sub}, true),
          set_config('request.jwt.claim.role', 'authenticated', true)`;
        await tx.unsafe("set local role authenticated");
        return fn(tx);
      }) as Promise<never>,
    ping: async () => {
      const [row] = await sql`select 1 as ok`;
      return row?.["ok"] === 1;
    },
    close: () => sql.end({ timeout: 5 }),
  };
}
