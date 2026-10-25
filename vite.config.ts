import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Configuração própria (sem o wrapper do Lovable).
// O build gera um servidor Node em .output/ (preset node-server), usado pelo Dockerfile.
// Para outro alvo, defina NITRO_PRESET no ambiente de build.
export default defineConfig(({ command }) => ({
  server: { host: "0.0.0.0", port: 3000 },
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Entrada do servidor com tratamento de erros de SSR (src/server.ts).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build"
      ? [nitro({ preset: process.env["NITRO_PRESET"] ?? "node-server" })]
      : []),
    viteReact(),
  ],
}));
