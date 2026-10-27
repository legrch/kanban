# Private Kanban template

Reusable source for a private Kanban workspace on Sites: compact board/list views,
Fibonacci estimates, evidence links, version-checked updates, durable activity and
per-project task numbers. Publishing this source does **not** publish a live board.

## Important boundaries

- This repository contains no real cards, activity, numbering exports, deployment
  identity or credentials. Synthetic fixtures live only under `tests/fixtures`.
- There is no runtime seed or automatic card initializer. `action: "seed"` is
  rejected without writes. SQL migrations define schema only.
- Public defaults are **not a drop-in configuration for an existing board**.
  Assemble the same common code with preserved private configuration using
  [the two-file overlay workflow](docs/private-deployment.md). Never deploy generic
  prefixes over existing numbered records, reset counters or import test fixtures.
- Authentication relies on trusted Sites dispatch headers and an **owner-private
  Site audience**, not merely on a signed-in user. Do not expose the Worker
  directly, trust client-supplied identity headers, or change the Site audience
  to public. Multi-user/public hosting requires a separate authorization design.
- `/api/service/board` returns 503 with public defaults. A private configuration overlay
  enables the same shared handler behind the existing Sites dispatch boundary. Browser API and MCP identity checks
  remain in place. Local mock sign-in is development-only, not production auth.

## Check the source

Use Node.js 24 and npm with the committed lockfile:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Tests use isolated in-memory SQLite, not a live D1 database. The GitHub workflow
runs tests/type checking on a standard Linux runner, with read-only repository
permissions and no deployment or secrets. GitHub usage limits and charges depend
on account, repository and runner settings; this project promises no free or
unlimited infrastructure.

`npm run dev` starts the Sites/Vinext development workflow. The database binding
is `DB`; `.openai/hosting.json` intentionally has no Site project ID. A running
preview needs a local schema initialized through the supported Sites tooling.
The source check workflow does not create a Site or provision storage.

## New private Site

1. Use the supported Sites setup flow with this sanitized directory as a retained
   template. Register a **new owner-private Site**, never reuse someone else's ID.
2. Let Sites configure its new deployment identity and D1 binding. Set the same
   returned identity in `config/deployment.json` (`siteProjectId`); keep
   `serviceMode` disabled unless private service access is explicitly configured. Run the
   schema-only migrations against that new database through supported tooling.
3. Keep the empty initial board. Create cards explicitly through the authenticated
   UI or MCP. Default project names are Alpha, Beta, Gamma, Delta and Ops; configure
   `config/deployment.json` before creating any numbered records.
4. Build and publish through the normal Sites workflow. Verify the private
   audience and authenticated read/write access. Do not deploy from public CI.

## Existing private deployment configuration

Use the [two-file private overlay workflow](docs/private-deployment.md). All
application logic, including the service handler, is shared. Only
`config/deployment.json` and `.openai/hosting.json` differ in the assembled private
checkout. Preserve exact existing prefixes and legacy overrides; never reset
mappings/counters or invoke old seed actions. A configuration flag is not proof of
the actual Site audience: verify owner-private access through Sites before publish.

## APIs and data integrity

`GET /api/board` reads cards; `POST /api/board` accepts `upsert` with a complete
card and exact version (0 creates). Stale writes return 409. `backfill_numbers` is
an explicit template migration operation, never a request-time initializer.
Read first, preserve owner edits, and verify after writing. Activity is appended
transactionally only for meaningful successful changes; reads page at 100 entries.
`/mcp` exposes board reading, card activity and upsert tools to authenticated Sites
requests. Canonical task links use `/tasks/ALP-001`-style routes.

Board source control is **not a data backup**. Keep cards, activity, immutable
number mappings and counter high-water marks in separate private backups. Never
commit database dumps, board exports, private links or account data here. Restoration
must preserve these records together and be tested on an isolated private copy.

## Licensing

No project-wide license has been selected. Public visibility does not itself
provide a general license to reuse or redistribute the project. Ask the owner
about intended reuse terms before sharing a modified distribution. Existing
third-party notices remain in `vendor/` and `scripts/vite/`; dependency licenses
continue to apply. No new license or rights grant is added by this export.
