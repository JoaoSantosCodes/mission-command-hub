import "./server/load-env.mjs";

/**
 * Em `vite` (dev) e `vite preview`, monta a ponte Express (`createBridgeApp`) **no próprio Vite**
 * para `/api/*`, sem depender de outro processo na porta 8787 nem do proxy.
 *
 * Ordem no Vite: `configureServer` / `configurePreviewServer` correm *antes* de cors/proxy/static,
 * por isso estes handlers são os primeiros na pilha.
 *
 * `MISSION_EMBED_API=0` — não monta a API (útil com `npm run dev:split` ou API externa em 8787).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);

/** @param {import("vite").PreviewServer | import("vite").ViteDevServer} server */
async function embedBridgeApi(server, label) {
  if (process.env.MISSION_EMBED_API === "0") {
    console.log(`[mission-api] MISSION_EMBED_API=0 — API não embebida (${label}); usa proxy /api → 8787 ou dev:split`);
    return;
  }

  const { createBridgeApp } = await import("./server/create-app.mjs");
  const app = await createBridgeApp(root);

  server.middlewares.use((req, res, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api")) return next();
    app(req, res, next);
  });

  console.log(`[mission-api] API embebida no Vite em /api (${label}) — não é necessário Express em :8787`);
}

export function missionApiPlugin() {
  return {
    name: "mission-api",
    apply: "serve",
    async configureServer(server) {
      await embedBridgeApi(server, "dev");
    },
    async configurePreviewServer(server) {
      await embedBridgeApi(server, "preview");
    },
  };
}
