# Contributing

## Before opening a PR

1. Match existing naming, package layout, and test style.
2. Keep changes focused — avoid drive-by refactors.
3. Run the checks that touch your area:
   - Backend: `cd backend && ./mvnw test`
   - Frontend: `cd frontend && npm ci && npm run lint && npm run test && npm run build`
   - OpenAPI: from repo root `npm run docs:lint` (required when changing `docs/openapi.yaml`)
4. Do not commit secrets (`.env`, `.env.local`, `application-secret.yaml`).
5. Do not change pinned Node/npm/Java versions without updating `.nvmrc`, `frontend/package.json` `engines`, `backend/pom.xml`, and CI together.
6. Do not introduce a Node/Next server for the SPA.

## API endpoint tests

Every new or changed REST handler needs a `@WebMvcTest` slice test in the matching `*ControllerTest`, plus integration coverage when behavior is non-trivial. Full path checklists live in repository [`AGENTS.md`](https://github.com/bbruneel/PGP-key-manager/blob/main/AGENTS.md).

## Manual QA

When the PR test plan calls for UI verification, follow [Manual QA](./manual-qa).

## Documentation

- Product and develop docs live under `docs/` (this VitePress site).
- Prefer editing the relevant `docs/user/**` or `docs/develop/**` page over growing the root README.
- Agent operating rules stay in `AGENTS.md` (keep slim; do not re-add phase essays — use [Phase history](/changelog/phases)).

### Screenshot capture convention

When replacing placeholders under `docs/public/assets/screenshots/`:

- Light theme, signed-in demo data
- No real private keys, passphrases, or production secrets in frame
- ~1280px width PNG or WebP
- Update the matching user guide page caption

## Cloud agents

Use branch prefix `cursor/` and the repository PR workflow. See `AGENTS.md` for Cursor Cloud environment gotchas.
