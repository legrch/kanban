import { readFileSync, readdirSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

export const LOCAL_ORIGIN = "http://127.0.0.1:5173";
export const LOCAL_STATE = ".wrangler/kanban-local";
export const localWorkerConfig = {
  name: "kanban-local",
  main: "./worker/index.ts",
  compatibility_date: "2026-05-15",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [{
    binding: "DB", database_name: "kanban-local",
    database_id: "00000000-0000-4000-8000-000000000001",
    migrations_dir: "drizzle", remote: false,
  }],
};

export function isUnconfiguredTemplate(root) {
  const config = JSON.parse(readFileSync(path.join(root, "config/deployment.json"), "utf8"));
  return config.serviceMode === "disabled" && config.siteProjectId === null;
}

// Local mode is deliberately separate from private Sites deployment. No runtime
// flag or request header can turn production into an unauthenticated local board.
/** @param {Record<string, string | undefined>} env */
export function assertLocalSettings(root, args = [], env = process.env) {
  if (args.length) throw new Error("Local mode takes no options: host, port, config and remote overrides are not supported.");
  const hosting = JSON.parse(readFileSync(path.join(root, ".openai/hosting.json"), "utf8"));
  if (!isUnconfiguredTemplate(root) || hosting.project_id != null || hosting.d1 !== "DB" || hosting.r2 != null) {
    throw new Error("Local mode requires the unconfigured public template, not a private Sites checkout.");
  }
  if (!isDeepStrictEqual(JSON.parse(readFileSync(path.join(root, "wrangler.local.json"), "utf8")), localWorkerConfig)) {
    throw new Error("Local Wrangler configuration changed; refusing non-local or conflicting bindings.");
  }
  const overrides = ["CLOUDFLARE_ENV", "CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH", "CLOUDFLARE_VITE_BUILD", "WRANGLER_ENV"];
  if (overrides.some(name => env[name])) throw new Error("Remove Cloudflare environment/config overrides before starting local mode.");
  if (readdirSync(root).some(name => /^\.(env|dev\.vars)(\.|$)/.test(name))) {
    throw new Error("Local mode does not load .env or .dev.vars files. Use a clean, unconfigured checkout.");
  }
}

/** @param {Record<string, string | undefined>} env */
export function localToolEnvironment(root, env = process.env) {
  const result = { ...env };
  // Do not pass inherited cloud credentials or private runtime paths to tools.
  for (const name of Object.keys(result)) {
    if (/^(CLOUDFLARE_|CF_|WRANGLER_|MINIFLARE_|SITES_)/.test(name)) delete result[name];
  }
  return Object.assign(result, {
    CI: "true",
    CLOUDFLARE_CF_FETCH_ENABLED: "false",
    WRANGLER_SEND_METRICS: "false",
    // In pinned Wrangler 4.92.0 this also skips the banner's npm update lookup.
    WRANGLER_HIDE_BANNER: "true",
    WRANGLER_WRITE_LOGS: "false",
    WRANGLER_LOG_PATH: path.join(root, LOCAL_STATE, "logs"),
    WRANGLER_REGISTRY_PATH: path.join(root, LOCAL_STATE, "registry"),
    MINIFLARE_REGISTRY_PATH: path.join(root, LOCAL_STATE, "miniflare-registry"),
  });
}

export function migrationCommand(root) {
  return [process.execPath, path.join(root, "node_modules/wrangler/bin/wrangler.js"),
    "d1", "migrations", "apply", "kanban-local", "--local",
    "--config", path.join(root, "wrangler.local.json"),
    "--persist-to", path.join(root, LOCAL_STATE)];
}
