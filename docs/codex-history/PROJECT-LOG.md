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

Players progress through 220 sequential waypoints. Every waypoint combines a
Three-Day Challenge (Glimmer, Glow, Radiance) with five ordered game modes (Drag
& Drop, Puzzle, Swap, Cue, Fill). Journey Stages (Learn, Recall, Strengthen,
Master) control long-term verse difficulty. Glow Points are the only currency.

## Current Project State

- Branch: `admin-verse-management`.
- Current HEAD at this update: `80f215e`.
- Phases 0–7 are complete and manually accepted, including bulk CSV import and
  dynamic verse-list search.
- The public landing page and internal UI-foundation preview are implemented.
- Better Auth registration, login, logout, onboarding, and protected-route flows
  are implemented and accepted.
- The complete product-aware Prisma schema and migrations are present and were
  applied successfully during Phase 3.
- Root `AGENTS.md` is the single authoritative agent instruction file;
  `docs/AGENTS.md` was removed.
- Current Phase 7 changes remain uncommitted for project-owner review.

## Current Roadmap Position

Phase 7 — Admin Verse Management meets its original acceptance criteria. Its
bulk CSV import and dynamic-search enhancement is implemented; Phase 8 — Admin
Pack Management follows after manual enhancement acceptance.

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

Complete Phase 7 audit hardening from pull-request review feedback.

## Exact Next Task

Verify create, update, publish, and archive audit records, then begin Phase 8 —
Admin Pack Management.

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

- Manually verify and commit the Phase 7 verse-management changes.
- Select an email delivery provider before implementing verification or password
  reset.
- Phases 8–32 remain pending in roadmap order.
- `.env.example` remains absent and is required by the security checklist.

## Blockers and Unresolved Questions

- No implementation blocker exists; immediate filter interaction awaits manual
  acceptance.
- No email delivery provider has been selected, so verification and password
  reset are intentionally not implemented.
- The recovered transcript contains historical references to the deleted
  `docs/AGENTS.md`. They are intentionally preserved because the file is an
  archive of what occurred, not a live instruction source.

## Dated Session Updates

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
