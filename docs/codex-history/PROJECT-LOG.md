# Scripture Memo Project Log

**Last updated:** 2026-07-12  
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

- Branch: `main`.
- `main` matches `origin/main` at commit `4701a3b` as of this update.
- Phases 0–4 of the roadmap are complete.
- The public landing page and internal UI-foundation preview are implemented.
- Better Auth's server/client foundation and auth route exist, but the complete
  Phase 5 authentication experience has not been implemented.
- The complete product-aware Prisma schema and migrations are present and were
  applied successfully during Phase 3.
- Root `AGENTS.md` is the single authoritative agent instruction file;
  `docs/AGENTS.md` was removed.
- There were no application-code modifications during the continuity-system task.

## Current Roadmap Position

Phase 4 — Core Libraries is complete.

The next roadmap phase is **Phase 5 — Authentication**. Better Auth's backend
foundation already exists, but Phase 5's feature-owned actions, schemas, UI,
route protection, authorization integration, and translation-selection flow have
not been implemented.

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

Phase 4 — Core Libraries has been implemented and verified. The changes are
uncommitted and awaiting project-owner review in VS Code Source Control.

## Exact Next Task

After the project owner reviews and commits Phase 4, begin **Phase 5, Task 1**:

> Create the `features/auth/` structure required for authentication, reusing the
> existing `features/auth/actions/` folder and preserving the current Better Auth
> configuration.

Before changing auth behavior, verify the installed Better Auth and Next.js 16
documentation and audit the current database/session integration.

## Important Decisions

- Root `AGENTS.md` overrides supporting documents when instructions conflict.
- Available Codex conversation history remains useful and should be read when
  present; this file is only a continuity backup and status summary.
- Repository state, Git state, root `AGENTS.md`, `PRODUCT-OVERVIEW.md`, and
  `ROADMAP.md` outrank both chat history and this log.
- Agents must not rely on chat history alone.
- Changes should remain uncommitted for review in VS Code Source Control unless
  the project owner explicitly asks Codex to commit or push.
- The Phase 4 placeholder Server Action using `ActionResult` belongs to the auth
  feature because authentication is the next feature that will consume the
  shared contract.
- `DEFAULT_HINT_ALLOWANCE = 5`.
- `BASE_GLOW_POINTS = 100` controls the Glimmer earning rate. New users start
  with 0 Glow Points.
- The Phase 4 rate limiter is process-local. Production authentication requires
  a distributed provider shared by every application instance.
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
- `features/auth/actions/get-auth-foundation-status.action.ts`: temporary
  auth-owned contract example.
- `lib/dates.ts`, `lib/permissions.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, and
  `lib/constants.ts`: Phase 4 core libraries.
- `docs/PRODUCT-OVERVIEW.md`: records the five-hint default, 100-point base
  reward, and zero starting balance.

## Outstanding Tasks

- Review and commit the Phase 4 changes.
- Phase 5: complete authentication UI, actions, authorization, Proxy, and initial
  translation selection.
- Phases 6–32 remain pending in roadmap order.
- `.env.example` remains absent and is required by the security checklist.

## Blockers and Unresolved Questions

- No blocker prevents Phase 4 completion.
- The process-local rate limiter cannot enforce a global limit across multiple
  production instances. Select and configure a distributed provider during
  Phase 5 before authentication is considered production-ready.
- The recovered transcript contains historical references to the deleted
  `docs/AGENTS.md`. They are intentionally preserved because the file is an
  archive of what occurred, not a live instruction source.

## Dated Session Updates

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
