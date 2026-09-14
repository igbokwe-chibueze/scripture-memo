# Phase 31 Performance and Polish Audit

**Status:** In progress  
**Started:** 2026-09-01

This document records Phase 31 evidence and remaining checks. It prevents a
passing automated check from being mistaken for a completed mobile or visual
review.

## Automated baseline

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- Non-database automated suites: 100 tests passed.
- Explicit TypeScript `any` audit: no matches in application source.
- Production `console.log` and `debugger` audit: no matches in application
  source.
- Prisma import audit: application queries remain repository-owned.

## Corrections completed

### Database operations

- The Vault summary previously loaded profile, streak, and settings with three
  independent one-to-one queries. It now selects those relations through one
  narrow learner query, reducing a normal Vault load from seven queries to five.
- Gameplay session rendering previously loaded settings and Beacon profile data
  separately. It now selects both one-to-one relations through one narrow
  learner query, reducing the shared gameplay render from five queries to four.
- Neither change adds writes, polling, transactions, or broader record payloads.

### Reduced motion

- Added one shared client preference that combines the operating-system media
  query with Scripture Memo's saved `reduce-motion` setting. Framer-based
  celebrations, route feedback, hints, confetti, and map scrolling now consume
  the combined signal instead of assuming CSS can stop JavaScript animation.
- Oil Shop purchase celebration entry, particles, radial effects, product
  entrance, and hint-balance count-up now become static when either reduced-
  motion source is enabled.
- Beacon level-up copy no longer runs a zero-duration pulse keyframe sequence
  under reduced motion; it renders directly at its final scale.

## Remaining audit work

- Inspect high-read repository methods for additional N+1 or duplicated reads.
- Confirm indexes against final high-read filters and ordering.
- Review client-component boundaries on data-heavy screens.
- Verify loading, empty, error, pending, and disabled states route by route.
- Inspect every player-facing route at a 375px viewport for wrapping, clipping,
  horizontal overflow, touch targets, and content hierarchy.
- Manually verify all motion and confetti surfaces with the in-app setting and
  operating-system setting independently enabled.
- Review Sonner messages for concise, consistent game tone.

Phase 31 is not complete until the remaining checks and required project-owner
manual checks pass.
