# Scripture Memo Project Log

**Last updated:** 2026-07-13
**Purpose:** Concise continuity backup and current-status summary for Codex
development sessions.

This log supplements normal Codex conversation history; it does not replace it.
When conversation history is available, use that history for detailed context
and reasoning, then use this log to confirm the latest completed work, decisions,
blockers, current task, and next step.

The current codebase and Git state are the final authority. Root `AGENTS.md`
governs implementation rules, while `docs/PRODUCT-OVERVIEW.md` and
`docs/ROADMAP.md` govern current product scope and implementation sequence. If
this log or conversation history disagrees with those sources, follow the
authoritative repository sources and correct this log.

## Project Summary

Scripture Memo is a full-stack, mobile-first scripture memorization web
application built with Next.js 16.2.10, strict TypeScript, Prisma 7, PostgreSQL,
Better Auth, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod, and Sonner.

Players progress through an expanding sequential waypoint curriculum
bootstrapped with 220 records. Every waypoint combines a Three-Day Challenge
(Glimmer, Glow, Radiance) with five ordered game modes (Drag & Drop, Puzzle,
Swap, Cue, Fill). Journey Stages (Learn, Recall, Strengthen, Master) control
long-term verse difficulty. Glow Points are the only currency.

## Current Project State

- Branch: `progression_engine`.
- Current HEAD at this update: `81a1597`.
- Phases 0–9 are complete and manually accepted, including bulk CSV import,
  dynamic verse-list search, and admin pack management.
- The public landing page and internal UI-foundation preview are implemented.
- Better Auth registration, login, logout, onboarding, and protected-route flows
  are implemented and accepted.
- The complete product-aware Prisma schema and migrations are present and were
  applied successfully during Phase 3.
- Root `AGENTS.md` is the single authoritative agent instruction file;
  `docs/AGENTS.md` was removed.
- Phase 9 waypoint management, curriculum-history hardening, and Phase 9A's
  application-wide error reference are merged at the current HEAD.
- Phase 10 progression engine is implemented with lazy initialization,
  server-authoritative cooldowns, atomic advancement, and focused tests.

## Current Roadmap Position

Phase 10 — Progression Engine is implemented. Phase 11 — Game Map is the next
roadmap phase after the Phase 10 verification handoff.

## Completed Work

### Phase 0 — Requirements Lock

- Product, architecture, progression, and security requirements reviewed.
- Next.js 16.2.10 and installed package documentation established as the
  framework authority.

### Phase 1 — Project Bootstrap

- Next.js App Router, strict TypeScript, Tailwind CSS 4, shadcn/ui, required
  dependencies, root route states, Sonner, aliases, and root-based structure.

### Phase 2 — Global UI Foundation

- Required shadcn primitives and shared UI components.
- Data-table building blocks.
- Protected-route loading and error boundaries.
- Light, dark, and system theme support.
- `/ui-foundation` verification page and product-branded public landing page.
- Tailwind CSS 4 canonical utility syntax policy.

### Phase 3 — Database and Prisma Setup

- Prisma 7 PostgreSQL configuration and server-only singleton.
- Better Auth identity tables preserved.
- All domain enums and product models implemented.
- Notes, favorites, account suspension, and non-rewarding Vault replay support.
- Critical relations, indexes, idempotency keys, reward ledger, and duplicate
  completion/badge constraints.
- Migration `20260712014802_complete_product_schema` created and applied.
- Prisma format, validation, client generation, TypeScript, ESLint, generated
  migration inspection, and production build passed.

### Phase 4 — Core Libraries

- Added the generic `ActionResult` discriminated union and an auth-owned action
  demonstrating the contract without implementing Phase 5 early.
- Added UTC-safe date helpers, permission guards, secret-redacting server logs,
  a process-local fixed-window rate limiter, and gameplay constants.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting Glow Points balance for new users.
- TypeScript, ESLint, diff validation, direct date and permission checks, Prisma
  generation, and the production build passed.

## Current Task

Verify the Phase 10 progression engine and prepare Phase 11 map implementation.

## Exact Next Task

Configure an empty migrated PostgreSQL test database through `TEST_DATABASE_URL`
and run `npm run test:progression:integration` when available. Then implement
Phase 11 — Game Map against the lazy progression repository.

## Important Decisions

- Root `AGENTS.md` overrides supporting documents when instructions conflict.
- Available Codex conversation history remains useful and should be read when
  present; this file is only a continuity backup and status summary.
- Repository state, Git state, root `AGENTS.md`, `PRODUCT-OVERVIEW.md`, and
  `ROADMAP.md` outrank both chat history and this log.
- Agents must not rely on chat history alone.
- Changes should remain uncommitted for review in VS Code Source Control unless
  the project owner explicitly asks Codex to commit or push.
- Bulk verse imports skip and report existing or repeated references; they never
  update existing verses. Imports are limited to 100 rows and 1 MB per file.
- Long predefined dropdowns use searchable comboboxes; short lists such as
  status, sort, theme, and translation remain simple selects.
- Every manual verse mutation and bulk import writes an actor-linked `AuditLog`
  record in the same transaction. Update metadata contains changed field names,
  never translation text, reflections, or study-note content.
- Packs start hidden, require at least one published verse before publishing,
  and automatically hide when their final verse is removed.
- Pack ordering uses one-based `PackVerse.position` values and supports pointer,
  touch, keyboard, and explicit arrow-button reordering.
- All 220 waypoint placeholders start hidden and unassigned with provisional
  `LEARN` stage. Assignment requires an explicit stage, and publishing requires
  an assigned, currently published verse.
- The initial 220 waypoints are a bootstrap count, not a maximum. Administrators
  append individual waypoints to one continuous historical sequence without
  year grouping.
- Published waypoints form a continuous prefix. Per verse, Learn, Recall, and
  Strengthen are unique and ordered; Master may repeat.
- Published but unstarted waypoint assignments must be hidden before editing.
  Any learner-linked history permanently locks waypoint ordering, assignment,
  Journey Stage, and visibility; there is no routine override.
- Published waypoint dependencies prevent verse archival. Once learner history
  exists for a verse's waypoint, the verse content is immutable so historical
  gameplay remains reproducible.
- Curriculum topology writes use one shared transaction-scoped PostgreSQL
  advisory lock. Assignment, publication, archival, and content edits also use
  stable per-verse locks so validation cannot race a conflicting mutation.
- Phase 10 creates progress lazily, unlocks the next actually published waypoint
  by database query, and commits completion plus unlocking atomically.
- Complex operational failures use stable feature codes from one structured
  catalogue. Sonner shows only the short safe message and code; the ADMIN-only
  reference page renders detailed safe guidance. Ordinary validation stays
  uncoded, and codes identify conditions rather than individual occurrences.
- The error reference is application-wide even though its first entries cover
  Waypoints and Verses. Its permanent link belongs on the future admin front
  page, not on either feature's management page.
- The Phase 4 placeholder Server Action using `ActionResult` belongs to the auth
  feature because authentication is the next feature that will consume the
  shared contract.
- `DEFAULT_HINT_ALLOWANCE = 5`.
- `BASE_GLOW_POINTS = 100` controls the Glimmer earning rate. New users start
  with 0 Glow Points.
- The Phase 4 rate limiter is process-local. Production authentication requires
  a distributed provider shared by every application instance.
- Better Auth's public API uses its database-backed rate limiter. Server Action
  calls use the application limiter because Better Auth excludes internal
  `auth.api` calls from its own request limiter.
- Email verification and password reset are deferred until an email delivery
  provider is selected; neither is required by the Phase 5 roadmap acceptance
  criteria.
- No `src/` directory; application code uses root-based, feature-owned folders.
- Route pages are one-line feature-view re-exports.
- Prisma access is repository-only, except singleton definition and Better Auth
  adapter initialization.
- Server Actions are the default mutation boundary and must validate, authenticate,
  authorize, call repositories, and revalidate.
- Durable application data belongs in PostgreSQL through Prisma, not JSON files.
- Mode 4 is Cue, never Hint; hints are a separate system.
- Hints are disabled during Strengthen and Master.
- Cooldowns, game order, completion, and rewards are server-authoritative.
- Glow Points are the only currency; no XP system exists.
- Reward balance changes require a transaction and immutable ledger entry.
- The database schema includes private notes, favorites, suspension state, and
  explicit Vault replay classification.

## Recent Important File Changes

- `AGENTS.md`: consolidated all agent instructions at the repository root; added
  authority, JSON persistence, and project-continuity rules.
- `docs/AGENTS.md`: deleted after consolidation into root `AGENTS.md`.
- `prisma/schema.prisma`: expanded into the complete product-aware schema.
- `lib/prisma.ts`: hardened Prisma 7 singleton with server-only protection and
  explicit environment validation.
- `prisma/migrations/20260712014802_complete_product_schema/migration.sql`:
  created and applied for the complete schema.
- `docs/PRODUCT-OVERVIEW.md` and `docs/ROADMAP.md`: reconciled schema models and
  index requirements.
- `features/landing/views/landing-view.tsx`: public landing page and canonical
  Tailwind gradient syntax.
- `docs/codex-history/CODEX_SESSION_2026-07-11_RECOVERED.md`: recovered historical
  transcript retained as an archive, not as an authoritative status source.
- `types/api.ts`: standard Server Action result contract.
- The temporary auth foundation action was removed after real auth actions adopted
  the shared `ActionResult` contract.
- `lib/dates.ts`, `lib/permissions.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, and
  `lib/constants.ts`: Phase 4 core libraries.
- `docs/PRODUCT-OVERVIEW.md`: records the five-hint default, 100-point base
  reward, and zero starting balance.
- `features/users/` and `features/settings/`: Phase 6 profile reads, preference
  persistence, settings UI, and authenticated preference synchronization.
- `app/(protected)/settings/page.tsx`: one-line protected settings route.
- `features/auth/`: registration, login, logout, translation onboarding, forms,
  repositories, schemas, and views.
- `lib/auth/session.ts`: authoritative server session helpers.
- `proxy.ts`: protected-route and admin navigation guards.
- `prisma/migrations/20260712032838_add_auth_rate_limit/migration.sql`:
  Better Auth database-backed rate-limit storage.
- `features/verses/components/markdown-editor.tsx`: accessible Markdown study-note
  editor with formatting controls, undo/redo, character count, and a safe preview
  that ignores embedded HTML.

## Outstanding Tasks

- Review and commit the Phase 10 progression-engine changes.
- Select an email delivery provider before implementing verification or password
  reset.
- Phases 11–32 remain pending in roadmap order.
- Configure an isolated migrated PostgreSQL database through
  `TEST_DATABASE_URL` and run both destructive repository integration suites
  before merging Phase 10 when that environment is available.
- `.env.example` remains absent and is required by the security checklist.
- Before upgrading to `pg` 9, update the configured database SSL mode explicitly
  to `verify-full` to preserve the current certificate-verification behavior.

## Blockers and Unresolved Questions

- No implementation blocker exists. Full database-backed integration execution
  awaits a separately configured empty test database; the suite refuses to use
  the current application database.
- No email delivery provider has been selected, so verification and password
  reset are intentionally not implemented.
- The recovered transcript contains historical references to the deleted
  `docs/AGENTS.md`. They are intentionally preserved because the file is an
  archive of what occurred, not a live instruction source.

## Dated Session Updates

### 2026-07-13 — Phase 10 progression engine implemented

- Added lazy first-playable-waypoint initialization and idempotent registration
  and login repair hooks without pre-creating future locked progress.
- Added UTC-safe day ordering and cooldown utilities with focused unit tests.
- Added transaction-locked gameplay preparation and trusted day completion;
  repeat completion, skipped days, cooldown bypass, locked waypoints, and stale
  publication state are rejected server-side.
- Made Day 3 completion, current waypoint completion, and next published
  waypoint unlock atomic. Curriculum numbering gaps are supported and reaching
  the end of currently published curriculum returns a caught-up result.
- Added eight application-wide progression error references and a guarded
  PostgreSQL integration suite. Unit tests, catalogue tests, strict TypeScript,
  lint, architecture checks, diff validation, and production build passed; the
  database suite skips until a separate `TEST_DATABASE_URL` is configured.

### 2026-07-13 — Operational error-code foundation implemented

- Extended failed `ActionResult` responses with catalogue-derived typed codes and
  added a shared persistent Sonner presenter for coded failures.
- Added 13 documented waypoint and verse codes covering curriculum history,
  publication continuity, Journey Stage rules, stale state, dependencies, and
  unexpected transactional failures.
- Added the server-authorized, searchable, `noindex` `/admin/error-reference`
  page. Its permanent link is intentionally deferred to the future admin front
  page instead of coupling the shared manual to Waypoints or Verses.
- Added fast catalogue tests for code uniqueness, format, and documentation
  completeness while leaving ordinary field validation uncoded.
- Updated authoritative agent, product, roadmap, security, and continuity
  documentation. Catalogue tests, strict TypeScript, ESLint, diff checks,
  thin-route validation, and the production build all passed.

### 2026-07-13 — Direct waypoint positioning added

- Added a per-row **Move to position** dialog for efficient long-distance
  waypoint reordering while retaining arrow controls for small adjustments.
- Direct moves validate whole-number bounds, progressed-waypoint immutability,
  the continuous published prefix, and per-verse Journey Stage order before
  updating local state.
- Successful moves report the requested destination and affected-position count,
  appear in the existing movement preview, and remain pending until **Save
  order** is selected.
- Strict TypeScript, ESLint, diff validation, and the production build passed.

### 2026-07-13 — Phase 9 curriculum-history hardening implemented

- Made published waypoint assignments editable only after hiding an unstarted
  waypoint and made every waypoint with learner-linked records immutable.
- Blocked verse archival while a published waypoint depends on it and froze
  verse content once learner history exists.
- Serialized curriculum topology and verse dependency mutations with shared
  PostgreSQL advisory locks and expanded assignment audit metadata to include
  previous and new state.
- Added an isolated PostgreSQL integration suite guarded by `TEST_DATABASE_URL`
  and a test-database-name check; the suite is skipped safely until a separate
  migrated test database is configured.
- Added the direct `server-only` dependency needed by standalone repository test
  execution without weakening the Next.js server boundary.
- Updated root instructions, product behavior, Phase 9 acceptance, and Phase 10
  progression constraints. Prisma validation, TypeScript, ESLint, diff checks,
  thin-route validation, and the production build passed.

### 2026-07-13 — Phase 9 assignment modal regression corrected

- Added the missing assigned-waypoint statistic alongside total, unassigned,
  published, and hidden counts.
- Reset assignment-dialog verse and stage state from persisted props on open,
  close, cancellation, successful save, and rejected save so a failed attempt
  cannot appear as the current assignment when the modal is reopened.
- TypeScript, ESLint, `git diff --check`, and the production build passed after
  the regression correction.

### 2026-07-13 — Phase 9 scalability and curriculum invariants revised

- Replaced the fixed 220 limit with ADMIN append-at-end behavior while retaining
  the idempotent 220-record bootstrap seed.
- Added waypoint statistics, continuous publish/hide rules, per-verse stage
  uniqueness and ordering, progress-aware reorder locks, pending visibility
  feedback, detailed movement previews, and aligned assignment-dialog actions.
- Added a PostgreSQL partial unique index migration so Learn, Recall, and
  Strengthen cannot duplicate for a verse while Master remains repeatable.
- Applied the invariant migration successfully. TypeScript, ESLint, Prisma
  validation, `git diff --check`, architecture checks, and the production build
  all passed; revised Phase 9 manual acceptance remains.

### 2026-07-13 — Phase 9 waypoint management implemented

- Approved the hidden, unassigned placeholder lifecycle with provisional
  `LEARN` stage and documented its lack of gameplay effect before publication.
- Added the Phase 9 repository, validated ADMIN actions, atomic audit records,
  fixed-slot ordering, searchable verse assignment, explicit Journey Stage
  selection, visibility controls, admin route, and Prisma 7 seed workflow.
- Added `tsx` as a development dependency for the documented TypeScript seed.
- Seeded all 220 placeholders successfully; a repeat run inserted zero and
  preserved all 220, confirming idempotency.
- TypeScript, ESLint, `git diff --check`, architecture checks, and the production
  Next.js build passed. Manual ADMIN acceptance remains.

### 2026-07-13 — Phase 8 manually accepted

- The project owner confirmed that all Phase 8 manual acceptance tests passed.
- Pack creation, published-verse membership, persistent ordering, visibility
  controls, empty-pack publishing prevention, and automatic hiding after final
  verse removal are accepted.
- Phase 8 is complete; Phase 9 — Admin Waypoint Management is the next roadmap
  task.

### 2026-07-13 — Phase 8 admin pack management implemented

- Added ADMIN-authorized pack repositories, Zod schemas, seven Server Actions,
  transaction-backed audit logging, and hidden/published lifecycle enforcement.
- Added `/admin/packs`, `/admin/packs/new`, and `/admin/packs/[id]/edit` through
  one-line route re-exports with protected loading and error boundaries.
- Added list, metadata form, searchable published-verse assignment, removal,
  persistent ordering, and publish/hide confirmation UI.
- Reordering supports mouse, touch, keyboard sensors, and explicit move buttons;
  two-phase temporary positions preserve the database uniqueness constraint.
- Phase 8 automated verification passed; manual ADMIN acceptance remains.

### 2026-07-13 — Phase 7 audit hardening

- Accepted PR review feedback that publish/archive availability changes lacked
  accountability records and applied the correction consistently to create,
  update, publish, and archive.
- Added stable audit action identifiers and centralized bounded request-IP
  extraction for server-derived audit context.
- Verse writes and their audit records now commit or roll back together.
- Update audits record changed field names only; status audits record prior and
  new availability without duplicating authored content.

### 2026-07-13 — Reference card and searchable long lists

- The project owner accepted canonical form and CSV boundary checks.
- Redesigned the Scripture reference card with a prominent generated-reference
  summary and aligned responsive location controls.
- Added a shared accessible searchable-select pattern and applied it to Bible
  books and countries while preserving simple controls for short lists.

### 2026-07-13 — Canonical Bible location validation implemented

- Added a reproducible, count-only dataset for all 66 books, 1,189 chapters, and
  31,102 NIV/KJV-compatible verse positions.
- Manual creation and editing now use a book selector, dynamic chapter and verse
  bounds, and a read-only generated reference preview.
- Server validation regenerates every reference from structured fields and
  rejects impossible locations independently of client controls.
- Removed `reference` from the CSV contract; imports use the same canonical
  validation and generation rules as individual forms.

### 2026-07-13 — Immediate verse filters implemented

- The project owner manually accepted CSV import and debounced search.
- Book, tag, publication status, and sorting controls now update immediately,
  preserve URL state, reset pagination, and show shared pending feedback.
- Removed the redundant Apply Filters button.

### 2026-07-12 — Phase 7 admin verse management implemented

- Added ADMIN-protected verse repositories, schemas, actions, normalization,
  create/edit forms, list table, filters, pagination, and publish/archive flow.
- All three MVP translations are required and `normalizedText` is generated only
  in the repository from trusted server input.
- Tags use normalized join records and Unicode-safe stable slugs.
- TypeScript, ESLint, diff validation, production build, thin-route checks, and
  repository-only Prisma architecture pass.
- Manual acceptance requires an ADMIN account; initial administrator bootstrap
  remains a project-owner decision.
- Upgraded the study-note field from a plain textarea to a Markdown editor with
  mobile-friendly controls, keyboard shortcuts, write/preview modes, and safe
  React rendering. Markdown remains in the existing `studyNote` text column.
- Fixed an intermittent post-create verse-list failure by removing an unnecessary
  read-only Prisma transaction. Independent list queries now use the normal
  connection-pool queue, and failures receive sanitized contextual server logs.
- The project owner manually accepted create, edit, filter, sort, archive, and
  publish behavior, completing the original Phase 7 acceptance criteria.
- Added an approved CSV enhancement with a downloadable strict template,
  row-level preview, duplicate and invalid-row reporting, server revalidation,
  transactional creation, normalized translations, and an admin audit record.
- Verse reference/book search now updates after a 300ms typing debounce while
  retaining URL-backed filters and pagination reset behavior.

### 2026-07-12 — Phase 6 profile and settings implemented

- Added protected profile/settings repositories, validation, action, form, view,
  and one-line route.
- Added ISO country selection, public-safe journey statistics, Bible translation,
  audio, reduced-motion, and theme preferences.
- Profile identity and preferences update atomically using the server session ID;
  no client-provided user ID is accepted.
- Added a protected-layout preference synchronizer so saved theme, motion, and
  audio state reapply across authenticated navigation and later sessions.
- TypeScript, ESLint, diff validation, production build, repository-boundary
  audit, thin-route audit, and anonymous `/settings` redirect passed.
- Manual authenticated persistence testing remains before Phase 6 is accepted.
- Fixed post-login continuation: Proxy-provided internal destinations such as
  `/settings` are now preserved through login, validated against the protected
  route allowlist to prevent open redirects, and resumed after authentication.

### 2026-07-12 — Phase 5 accepted

- The project owner confirmed the manual authentication flow works correctly.
- Final verification passed: Prisma format/validate/generate, TypeScript, ESLint,
  diff validation, production build, five-rule password-schema behavior, public
  auth rendering, and anonymous redirects for game, translation, and admin paths.
- Phase 5 is complete; Phase 6 — User Profile and Settings is next.

### 2026-07-12 — Phase 5 authentication implemented

- Added validated register/login/logout actions, onboarding repository writes,
  responsive forms, translation selection, session helpers, and protected routes.
- Added full-session Proxy guards for protected and admin routes.
- Added and applied Better Auth's database-backed rate-limit migration.
- Verified Prisma, TypeScript, ESLint, production build, public auth rendering,
  and anonymous protected-route redirects.
- Left manual credential and admin-role acceptance testing to the project owner;
  no test user was inserted into the configured database.
- Improved login-to-registration continuity: the entered login email is carried
  once through tab-scoped `sessionStorage`, then removed after prefilling the
  registration form. Passwords are never persisted and emails are not placed in
  URLs or server logs.
- Added an accessible password visibility toggle and live password-strength
  checker to registration. Added only the approved special-character validation
  rule while preserving the existing length, letter, and number requirements.
- Refined password-field polish after visual review: visibility controls are
  anchored to the input midpoint, and the Good strength state uses a dedicated
  lime treatment that remains distinct in dark mode.
- Strengthened registration passwords by replacing the general letter rule with
  separate lowercase and uppercase requirements. The live checker now uses five
  requirements and reserves Strong for passwords satisfying all five.
- Diagnosed translation onboarding that saved successfully but remained on the
  pending screen. Removed overlapping client push/refresh navigation, added a
  safe action failure result, and made settings persistence self-healing with an
  upsert for partially onboarded accounts.

### 2026-07-12 — Phase 4 completed

- Implemented all Phase 4 core-library tasks and the approved auth-owned action
  contract example.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting balance for new users.
- Verified TypeScript, ESLint, diff checks, date arithmetic, permission failures,
  Prisma generation, and the production build.
- Left all changes uncommitted for project-owner review.

### 2026-07-12 — Continuity system established

- Reviewed root instructions, product overview, roadmap, current repository,
  Git history/state, and the recovered 2026-07-11 transcript.
- Added the project continuity workflow to root `AGENTS.md`.
- Created and populated this project log.
- Confirmed normal conversation history remains part of future context recovery.
- Confirmed the repository is authoritative when any source disagrees.
- No application code changed; changes were intentionally left uncommitted.

### 2026-07-12 — Phase 4 action ownership approved

- The project owner approved `features/auth/actions/` as the owner of Phase 4's
  placeholder Server Action using the shared `ActionResult` type.
- Phase 4 implementation has not started and awaits an explicit instruction to
  proceed.

### 2026-07-12 — Phase 3 completed

- Completed the full product-aware Prisma schema.
- Applied migration `20260712014802_complete_product_schema`.
- Verified Prisma generation/validation, TypeScript, ESLint, critical database
  constraints, and the production build.

### 2026-07-11 — Foundation work recovered

- Recovered the prior development transcript into the codex-history archive.
- Completed project bootstrap and global UI foundation work.
- Added the landing page, theme system, shared components, and UI preview.
