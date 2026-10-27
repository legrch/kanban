# One codebase, two private configuration files

The public repository is common application code, not a public board. Its generic
configuration disables the service route. Existing private Sites use **exactly the
same code**, composed with two reviewed JSON configuration files. No private handler
fork, runtime seed, new auth system or database migration is introduced.

## Private inputs

Store these outside the public checkout or under ignored `.private/`:

- `deployment.json`: the exact existing `projects` map, `defaultProject`,
  `defaultOwner`, `defaultPrefix`, `legacyPrefixes`, `serviceMode` and `siteProjectId`.
- `hosting.json`: the existing Sites manifest, identity and storage bindings.

`legacyPrefixes` maps original global sequence strings to approved project prefixes.
Preserve previously issued prefixes/mappings even when project labels change.
`sites-owner-private` only selects the established service handler; it is **not**
evidence that the Site actually has that audience. Independently verify owner-private
Sites dispatch before publication. Never expose this Worker directly or accept
untrusted identity headers. Do not put credentials or card records in these inputs.

## Local assembly

Use Node 24. Starting in the public source directory:

```sh
node --import ./scripts/test-loader.mjs scripts/assemble-private.mjs \
  /path/to/public-source /path/to/private-input /path/to/new-private-assembly
```

The target must not exist. This avoids overwriting unrelated files in an authoritative
checkout. The script validates configuration, copies source-only files and substitutes
only `config/deployment.json` and `.openai/hosting.json`. It refuses unexpected
symlinks and produces a **private** sibling `.assembly-receipt.json`, recording the
public source file hashes/tree hash and both private configuration hashes. It does
not verify Git HEAD, actual audience or provenance claims, and makes no network,
Git, database or publication calls. Never publish the private assembly or receipt
to the public GitHub repository.

Run tests, type checking and the official Sites build workflow on the assembly.
`prebuild` checks that both configurations agree; it cannot establish live access.
Generic source CI and private assembly both run the same tests. Configuration-driven
compatibility tests verify all configured prefixes, override entries, no-op state
preservation and service-mode behavior against isolated synthetic SQLite records.

## Normal private publication and recovery

Before any real publication, open/reconcile the current authoritative Sites source
through the supported Sites workflow. An old archive is not evidence of current Git
HEAD. Preserve unrelated changes. Integrate reviewed common source and the exact two
private configurations, verify the allowed source differences, and record the public
Git commit (after it exists), private configuration hashes, resulting private Sites
source commit and deployed version in private release evidence. Keep the real
manifest/configuration in the private Sites source repository as normal; never push
that checkout to the public source remote.

Use native owner-private publication without widening the audience. Do not invoke
seed, backfill or any database write as part of assembly. Recovery needs the common
source revision **and** matching private configuration. Separately retain private
backups of cards, activity, immutable number mappings and counter high-water marks.
Verify restores on an isolated private database before any real recovery operation.

No license or rights grant is introduced by this workflow.
