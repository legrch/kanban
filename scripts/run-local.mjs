import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertLocalSettings, LOCAL_ORIGIN, LOCAL_STATE, localToolEnvironment, migrationCommand } from "./local-settings.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function applyLocalMigrations(root, run = spawnSync, env = localToolEnvironment(root)) {
  const [executable, ...args] = migrationCommand(root);
  const result = run(executable, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal) throw new Error("Local database migration failed; server was not started. Existing data was not reset. See the Wrangler error above.");
}

export async function verifyLocalServer(fetcher = fetch) {
  const options = { redirect: "manual", signal: AbortSignal.timeout(60_000) };
  const signIn = await fetcher(`${LOCAL_ORIGIN}/signin-with-chatgpt?return_to=%2F`, options);
  const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
  if (signIn.status !== 302 || !cookie) throw new Error("Local sign-in health check failed.");
  const response = await fetcher(`${LOCAL_ORIGIN}/api/board`, { ...options, headers: { cookie } });
  if (!response.ok || !Array.isArray((await response.json()).cards)) throw new Error("Local database health check failed.");
  const home = await fetcher(`${LOCAL_ORIGIN}/`, { ...options, headers: { cookie } });
  if (!home.ok || !home.headers.get("content-type")?.includes("text/html")) throw new Error("Local dashboard health check failed.");
  await home.text();
}

export async function startLocal(args = [], dependencies = {}) {
  const root = dependencies.root ?? projectRoot;
  assertLocalSettings(root, args);
  let server;
  try {
    const env = localToolEnvironment(root);
    applyLocalMigrations(root, dependencies.runMigration, env);
    // Vite runs in this process; keep its tools local too, without editing any
    // user's shell configuration or inspecting credential values.
    for (const name of Object.keys(process.env)) {
      if (/^(CLOUDFLARE_|CF_|WRANGLER_|MINIFLARE_|SITES_)/.test(name)) delete process.env[name];
    }
    Object.assign(process.env, env);
    const createServer = dependencies.createServer ?? (await import("vite")).createServer;
    server = await createServer({ configFile: path.join(root, "vite.local.config.ts"), clearScreen: false });
    await server.listen();
    await (dependencies.verify ?? verifyLocalServer)();
    console.log(`\nKanban is ready: ${LOCAL_ORIGIN}\nLocal-only data: ${path.join(root, LOCAL_STATE)}\nStop with Ctrl+C. Restart with npm run dev; cards and history are retained.\n`);
    const stop = async () => { await server.close(); process.exit(0); };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return server;
  } catch (error) {
    await server?.close();
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startLocal(process.argv.slice(2));
}
