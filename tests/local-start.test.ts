import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assertLocalSettings, isUnconfiguredTemplate, localToolEnvironment, localWorkerConfig, migrationCommand } from '../scripts/local-settings.mjs';
import { applyLocalMigrations, startLocal, verifyLocalServer } from '../scripts/run-local.mjs';
import { isLocalRequest, localBoundary } from '../scripts/vite/local-boundary.mjs';
import { testConfig } from './fixtures/config';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'kanban local settings '));
  for (const file of ['config', '.openai', 'wrangler.local.json']) cpSync(resolve(file), join(root, file), { recursive: true });
  writeFileSync(join(root, 'config/deployment.json'), JSON.stringify(testConfig));
  writeFileSync(join(root, '.openai/hosting.json'), JSON.stringify({ d1: 'DB', r2: null }));
  return { root, close: () => rmSync(root, { recursive: true, force: true }) };
}

test('local migrations use explicit local-only config and shared persistent directory, including paths with spaces', () => {
  const { root, close } = fixture();
  try {
    assertLocalSettings(root, [], {});
    assert(isUnconfiguredTemplate(root));
    assert.equal(localWorkerConfig.d1_databases[0].remote, false);
    const command = migrationCommand(root);
    assert(command.includes('--local'));
    assert(!command.includes('--remote'));
    assert.equal(command[command.indexOf('--persist-to') + 1], join(root, '.wrangler/kanban-local'));
    assert.equal(command[command.indexOf('--config') + 1], join(root, 'wrangler.local.json'));
  } finally { close(); }
});

test('local mode refuses private identities, remote/config overrides, dotenv and network flags', () => {
  const { root, close } = fixture();
  try {
    for (const args of [['--host', '0.0.0.0'], ['--port', '6000'], ['--remote'], ['--config', 'other.json']]) {
      assert.throws(() => assertLocalSettings(root, args, {}), /no options/);
    }
    assert.throws(() => assertLocalSettings(root, [], { CLOUDFLARE_ENV: 'production' }), /overrides/);
    const workerPath = join(root, 'wrangler.local.json');
    const originalWorker = readFileSync(workerPath, 'utf8');
    const remote = JSON.parse(originalWorker); remote.d1_databases[0].remote = true;
    writeFileSync(workerPath, JSON.stringify(remote));
    assert.throws(() => assertLocalSettings(root, [], {}), /bindings/);
    writeFileSync(workerPath, originalWorker);
    writeFileSync(join(root, '.env.local'), 'SYNTHETIC=1');
    assert.throws(() => assertLocalSettings(root, [], {}), /does not load/);
    rmSync(join(root, '.env.local'));
    const deployment = JSON.parse(readFileSync(join(root, 'config/deployment.json'), 'utf8'));
    deployment.siteProjectId = 'appgprj_00000000000000000000000000000000';
    writeFileSync(join(root, 'config/deployment.json'), JSON.stringify(deployment));
    assert.equal(isUnconfiguredTemplate(root), false);
    assert.throws(() => assertLocalSettings(root, [], {}), /private Sites/);
  } finally { close(); }
});

test('local tool environment omits inherited cloud credential and private runtime variables', () => {
  const env = localToolEnvironment('/synthetic checkout', {
    PATH: '/synthetic/path', CLOUDFLARE_API_TOKEN: 'synthetic-test-only',
    CF_ACCOUNT_ID: 'synthetic', SITES_RUNTIME_ROOT: '/synthetic/private',
    WRANGLER_SEND_METRICS: 'true', WRANGLER_HIDE_BANNER: 'false', CLOUDFLARE_CF_FETCH_ENABLED: 'true',
  });
  assert.equal(env.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(env.CF_ACCOUNT_ID, undefined);
  assert.equal(env.SITES_RUNTIME_ROOT, undefined);
  assert.equal(env.WRANGLER_SEND_METRICS, 'false');
  assert.equal(env.WRANGLER_HIDE_BANNER, 'true');
  assert.equal(env.CLOUDFLARE_CF_FETCH_ENABLED, 'false');
  assert.equal(env.PATH, '/synthetic/path');
});

test('local boundary uses the real connection, strict local authority and same-origin requests, not forwarded headers', () => {
  const request = { url: '/api/board', headers: { host: '127.0.0.1:5173' } as Record<string, string>, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(isLocalRequest(request), true);
  for (const host of ['example.com:5173', '127.0.0.1.evil.test:5173', '127.0.0.1:80']) assert.equal(isLocalRequest({ ...request, headers: { host } }), false);
  assert.equal(isLocalRequest({ ...request, socket: { remoteAddress: '192.0.2.1' }, headers: { ...request.headers, 'x-forwarded-for': '127.0.0.1' } }), false);
  for (const headers of [{ origin: 'https://evil.test' }, { 'sec-fetch-site': 'cross-site' }]) assert.equal(isLocalRequest({ ...request, headers: { ...request.headers, ...headers } }), false);
  assert.equal(isLocalRequest({ ...request, url: 'http://evil.test/api/board' }), false);
});

test('resolved local Vite settings cannot build, preview or listen outside the fixed loopback port', () => {
  const plugin = localBoundary();
  const check = plugin.configResolved as (config: unknown) => void;
  const config = { command: 'serve', isPreview: false, server: { host: '127.0.0.1', port: 5173, strictPort: true, cors: { preflightContinue: true } } };
  check(config); assert.equal(config.server.cors, false);
  for (const patch of [{ host: '0.0.0.0' }, { port: 5174 }, { strictPort: false }, { https: {} }, { proxy: {} }]) {
    assert.throws(() => check({ ...config, server: { ...config.server, ...patch } }), /development-only/);
  }
  assert.throws(() => check({ ...config, command: 'build' }), /development-only/);
  assert.throws(() => check({ ...config, isPreview: true }), /development-only/);
});

test('failed or interrupted migrations stop before creating a Vite server', async () => {
  const { root, close } = fixture();
  let starts = 0;
  try {
    for (const result of [{ status: 1 }, { status: null, signal: 'SIGINT' }]) {
      assert.throws(() => applyLocalMigrations(root, () => result as never), /migration failed/);
      await assert.rejects(startLocal([], { root, runMigration: () => result, createServer: async () => { starts++; throw new Error('unexpected'); } }), /migration failed/);
    }
    assert.equal(starts, 0);
  } finally { close(); }
});

test('readiness requires local sign-in, a valid database response and dashboard HTML', async () => {
  const responses = () => [new Response(null, { status: 302, headers: { 'set-cookie': '__sites_local_auth=1; HttpOnly' } }), Response.json({ cards: [] }), new Response('<html></html>', { headers: { 'content-type': 'text/html' } })];
  const ok = responses();
  await verifyLocalServer((async () => ok.shift()!) as typeof fetch);
  for (let index = 0; index < 3; index++) {
    const bad = responses(); bad[index] = new Response('unavailable', { status: 503 });
    await assert.rejects(verifyLocalServer((async () => bad.shift()!) as typeof fetch), /health check failed/);
  }
});

test('port collision and failed readiness close the owned server and never announce ready', async () => {
  const { root, close } = fixture();
  try {
    for (const failAt of ['listen', 'verify']) {
      let closed = 0;
      const server = {
        async listen() { if (failAt === 'listen') throw new Error('Port 5173 is already in use'); },
        async close() { closed++; },
      };
      await assert.rejects(startLocal([], {
        root,
        runMigration: (() => ({ status: 0 })) as never,
        createServer: (async () => server) as never,
        verify: async () => { throw new Error('Local database health check failed'); },
      }), failAt === 'listen' ? /Port 5173/ : /health check failed/);
      assert.equal(closed, 1);
    }
  } finally { close(); }
});
