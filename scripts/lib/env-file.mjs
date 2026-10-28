import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Leitura e escrita simples de arquivos .env (KEY=valor, comentários preservados).

export function readEnv(path) {
  const values = {};
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) values[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

/** Atualiza chaves existentes (inclusive vazias) e acrescenta as que faltam. */
export function upsertEnv(path, updates) {
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const pending = new Map(Object.entries(updates));
  const out = lines.map((line) => {
    const m = /^\s*([A-Z0-9_]+)\s*=/.exec(line);
    if (m && pending.has(m[1])) {
      const value = pending.get(m[1]);
      pending.delete(m[1]);
      return `${m[1]}=${value}`;
    }
    return line;
  });
  if (pending.size) {
    if (out.length && out.at(-1) !== "") out.push("");
    for (const [k, v] of pending) out.push(`${k}=${v}`);
  }
  writeFileSync(path, out.join("\n").replace(/\n*$/, "\n"));
}
