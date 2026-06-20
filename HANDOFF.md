# HRI — Codebase Handoff Brief

Purpose of this file: a single document for the next person/agent picking up this repo, covering what the app is, how it's built, what's solid, and what needs to change before this can grow. Written from a full read-through of the codebase on 2026-06-20.

## What the app does

**HRI** ("HR Intelligence") is a Next.js SaaS that helps small/unstructured organizations formalize their HR setup. Three core flows:

1. **Organizational Audit** — a weighted questionnaire scored across 5 capability domains (role clarity, documentation maturity, decision ownership, KPI maturity, process structure), producing an overall maturity score, ranked issues, and recommended actions.
2. **Job Description Generator** — AI-generated (OpenAI) responsibilities/competencies/KPIs for a role, editable before saving.
3. **RACI Matrix Builder** — AI-assisted or manual RACI (Responsible/Accountable/Consulted/Informed) matrices mapping roles to tasks, scoped per organization, with a separate "sector template" system (manufacturing, healthcare, retail, IT, construction) meant to seed roles/tasks per industry.

Multi-tenant: every entity hangs off `Organization` (`prisma/schema.prisma`). Auth is via Clerk, with a **dev-auth fallback** (hardcoded `admin`/`admin`) that activates automatically whenever `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is unset (`lib/auth/dev-auth.ts`).

## Stack

- Next.js 16.2.1 / React 19.2.4 / TypeScript, App Router. **Note:** this Next.js version renames `middleware.ts` → `proxy.ts` (see `proxy.ts` at root) — confirmed against `node_modules/next/dist/docs/`. Don't assume training-data Next.js conventions; check the docs there before touching routing/config.
- Prisma 7 + `@prisma/adapter-pg` (driver adapter, not the legacy Prisma engine binary) + Postgres.
- Clerk for auth, OpenAI SDK (`gpt-4o` by default) for generation, Zod for all I/O validation.
- Tailwind v4, shadcn-style `components/ui/*`, Framer Motion, Recharts (dashboard charts), TanStack Table.
- Vitest (unit) + Playwright (e2e) are wired into `package.json` scripts but **no config files exist for either** (`vitest.config.*`, `playwright.config.*` are absent). `npm test` / `npm run test:e2e` will not run as-is.
- Husky + lint-staged pre-commit (eslint --fix + prettier).

## Architecture pattern (consistent across features)

Each domain lives under `features/<name>/` with:

- `schemas/*.schemas.ts` — Zod schemas + inferred types (single source of truth for shape).
- `services/*.ts` — Prisma calls + business logic, returning a `ServiceResult<T>` (`lib/errors/service-error.ts`): `{ success: true, data } | { success: false, error: { code, message } }`. No throwing across service boundaries.
- `components/*` — feature UI.
- (RACI only) `domain/*` — framework-free pure-function domain model.

API routes (`app/api/**/route.ts`) are thin: `requireOrg()` → `parseRequestBody(schema)` → call service → map `ServiceResult` to `NextResponse`. This pattern is followed faithfully everywhere — it's the strongest, most consistent part of the codebase and should be preserved in any new feature work.

`requireOrg()` (`lib/auth/require-auth.ts`) auto-creates a dev user + org on first request when in dev-auth mode, and throws a `NextResponse` (401/403) which routes catch with `if (error instanceof NextResponse) return error`. Unusual pattern (throwing a response) but applied consistently.

## Data model (`prisma/schema.prisma`)

`User` → `Organization` (1:N) → `Audit`/`Role`/`RaciMatrix`. `Audit` → `AuditAnswer`. `Role` → `JobDescription`. `DocumentTemplate` and `ExportJob` are flatter, org/user-scoped. Heavy use of untyped `Json` columns (`resultJson`, `matrixJson`, `responsibilitiesJson`, etc.) — the Zod schemas in each feature are the only thing keeping these honest; there's no DB-level constraint on their shape.

## What's genuinely good here

- The `ServiceResult` + Zod-at-the-boundary pattern is clean and uniform across every route — copy it for new features rather than inventing something else.
- `features/raci/domain/role-model.ts` and `sector-engine.ts` are well-isolated, framework-free domain code with real unit tests (`role-model.test.ts`, `sector-engine.test.ts`, `customization.test.ts`) — the only tested code in the repo.
- AI calls (`lib/ai/ai-service.ts`) consistently validate model output against a Zod schema (`parseAiResponse`) with a retry-on-validation-failure loop, rather than trusting raw JSON from the model.
- Multi-tenant isolation is checked consistently in services (`findFirst({ where: { id, organizationId } })`) rather than relying solely on the route layer.

## What needs attention before "leveling up" — concrete findings

1. **Dev-auth bypass is a live security hole if ever deployed without Clerk keys set.** `isDevAuthMode()` activates purely on the absence of an env var — there's no explicit "dev mode" flag — and grants admin access via hardcoded `admin`/`admin` credentials with no rate limiting. If this ever ships to an environment where the Clerk env var is accidentally missing, the entire app is wide open. Recommend gating this behind `NODE_ENV !== 'production'` explicitly, not just env var presence. See `lib/auth/dev-auth.ts`, `lib/auth/require-auth.ts`, `proxy.ts`.

2. **Dead/orphaned domain code in RACI.** `features/raci/domain/ai-repair.ts` (validation-issue detection + repair-suggestion engine for malformed RACI matrices) and `persistence.ts` (format migration v0→v1, referential integrity checks, `checkOrgAccess`) are fully built, fairly sophisticated, and **not called from any route or service** — only their own test file references them. Either wire them into `raci-service.ts` (e.g. run `detectAndMigrate`/`validateReferentialIntegrity` on load, expose repair suggestions in the UI) or remove them. Right now they're unreachable code with maintenance cost and no payoff.

3. **The i18n implementation is a DOM-scraping hack, not real i18n.** `components/i18n/language-provider.tsx` walks every text node in `document.body` with `TreeWalker`, string-matches it against a dictionary in `lib/i18n/translations.ts`, and rewrites `node.nodeValue` in place — re-triggered on every DOM mutation via a `MutationObserver`. This is fragile (breaks on any text not in the dictionary verbatim, fights React hydration, re-runs on every re-render, no pluralization/interpolation, no SSR-rendered translated content, accessibility tools see the swapped text not the source), and will not scale past a handful of static strings. This was added very recently (untracked in git). **Recommend replacing with `next-intl` or a standard `t()`-call pattern before more pages depend on it** — the longer this DOM-walking approach is load-bearing, the more expensive the migration becomes.

4. **No test runner config.** `vitest run` / `playwright test` are in `package.json` but there's no `vitest.config.ts` or `playwright.config.ts` anywhere in the repo — only `node_modules`-internal ones turn up. The 3 existing RACI domain tests presumably only ever ran via IDE/default config. Add real configs and decide what the testing strategy should cover (services, scoring engine, API routes) — right now coverage is effectively zero outside one isolated domain module.

5. **No CI.** No `.github/workflows`. Lint/typecheck/test only run locally via husky pre-commit (and that only covers staged files via lint-staged, not the full project, not tests).

6. **Exports are fake.** `features/exports/services/export-service.ts` creates an `ExportJob` row and immediately marks it `completed` with no `fileUrl` ever set — there's no actual file generation. `app/api/exports/route.ts` and the UI presumably show a "completed" export that doesn't produce anything downloadable. Either this is intentionally stubbed for MVP (fine, but should be marked `TODO`/tracked) or it's a silent gap users will hit.

7. **Telemetry is `console.log` in dev, no-op in prod.** `lib/telemetry/events.ts` has a `// TODO: integrate with analytics provider` — fine for now, but means there's currently zero production observability into usage, AI failures, or audit completion rates. Given how much of the product is "AI generates structured output, validate it, retry once" (`ai-service.ts`), you have no real signal today on how often that retry path is actually triggered in production.

8. **Scoring/recommendation logic is hardcoded English copy in `scoring-engine.ts`.** `getRecommendationsForDomain` returns literal English strings, which won't pass through the new i18n layer (point 3) without separate handling — worth reconciling once i18n is redone properly.

9. **Housekeeping:** `./hri/.git/` is a stray nested git repo (empty besides `.git/gk/config`) and `./.agents/` is an empty directory — both look like leftover scaffolding, not part of the app. Worth deleting if confirmed unused, after checking with whoever created them.

10. **`next.config.ts` is the default scaffold** — no image domains, no experimental flags, nothing customized yet. Worth revisiting once you know real deployment constraints (e.g. if OpenAI calls need streaming, if Clerk needs specific config).

## Suggested order of attack for "next level"

1. Lock down dev-auth (#1) — security, cheap fix, do first regardless of what else happens.
2. Decide fate of `ai-repair.ts`/`persistence.ts` (#2) — either wire in or delete; don't let it linger as the RACI feature grows.
3. Replace the DOM-walking i18n (#3) before more strings/pages accumulate — this is the most expensive-to-defer item.
4. Add `vitest.config.ts`/`playwright.config.ts` + a minimal CI workflow (#4, #5) — needed before any of the above changes can be verified with confidence at scale.
5. Resolve or explicitly track the fake export pipeline (#6).
6. Wire real telemetry once you know which provider (#7) — useful immediately for watching AI-validation retry rates.

## Key files to read first if you're new here

- `prisma/schema.prisma` — full data model.
- `lib/errors/service-error.ts`, `lib/validations/parse.ts` — the `ServiceResult` pattern used everywhere.
- `app/api/raci/generate/route.ts` + `lib/ai/ai-service.ts` — the AI-generation-with-validation pattern, repeated for job descriptions.
- `features/raci/domain/*` — the only framework-free, tested domain logic; a template for how the rest of the domain logic _should_ look.
- `lib/auth/require-auth.ts`, `lib/auth/dev-auth.ts`, `proxy.ts` — full auth picture, including the dev bypass.
