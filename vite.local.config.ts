import vinext from "vinext";
import { defineConfig, type UserConfig } from "vite";
import { fileURLToPath } from "node:url";
import { assertLocalSettings, LOCAL_STATE } from "./scripts/local-settings.mjs";
import { localBoundary } from "./scripts/vite/local-boundary.mjs";
import { sites } from "./scripts/vite/sites-vite-plugin";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig(async ({ command, isPreview }) => {
  if (command !== "serve" || isPreview) throw new Error("Local mode cannot build or preview a production deployment.");
  assertLocalSettings(root);
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    root,
    server: { host: "127.0.0.1", port: 5173, strictPort: true, cors: false, allowedHosts: ["localhost"] },
    plugins: [
      vinext(), localBoundary(), sites({ mockAuth: true }),
      cloudflare({
        configPath: fileURLToPath(new URL("./wrangler.local.json", import.meta.url)),
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        persistState: { path: LOCAL_STATE },
        remoteBindings: false,
        tunnel: false,
        inspectorPort: false,
      }),
    ],
  } satisfies UserConfig;
});
