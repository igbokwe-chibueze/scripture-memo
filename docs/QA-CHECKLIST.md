# Phase 30 — Testing and QA Checklist

**Started:** 2026-08-29  
**Status:** In progress  
**Acceptance gate:** All 16 manual flows pass and no known Critical or High
security issue remains unresolved.

## Result legend

| Result | Meaning |
|---|---|
| Not run | The flow still requires verification. |
| Passed | The complete flow produced the expected result. |
| Failed | A reproducible product defect was found. |
| Blocked | The environment cannot currently execute the flow reliably. |

## Automated baseline

| Check | Result | Evidence |
|---|---|---|
| TypeScript strict compilation | Passed | `npx tsc --noEmit` on 2026-08-29 |
| Full ESLint pass | Passed | `npm run lint` on 2026-08-29 |
| Non-database unit tests | Passed | 99 tests across errors, guards, progression, streaks, gameplay, rewards, hints, badges, Vault, map, localization, Fellowships, Beacon, and verse import |
| Waypoint repository integration | Blocked | Dedicated hosted test database requires an empty curriculum, but Prisma currently rejects its guarded reset with `planLimitReached`. |
| Progression repository integration | Blocked | Dedicated hosted test database requires an empty curriculum, but Prisma currently rejects its guarded reset with `planLimitReached`. |
| Reward repository integration | Blocked | The hosted test resource cannot complete reliable fixture cleanup while its Prisma workspace plan limit is active. |

Integration suites must run **sequentially**, because the waypoint and
progression suites both own the complete temporary curriculum and require the
same dedicated database to be empty at startup.

The reusable `npm run test:database:reset` command validates that the test URL is
separate from the application database before clearing application tables. Rerun
it only after Prisma lifts the current workspace plan restriction.

## Manual regression flows

| # | Flow | Expected evidence | Result |
|---:|---|---|---|
| 1 | Authentication | Register, login, logout, and login again return to the correct protected destination. | Passed — project-owner manual verification on 2026-08-29. |
| 2 | Admin route protection | A Player cannot open `/admin`; Admin and Super Admin permissions remain distinct. | Passed — project-owner manual verification on 2026-08-29. |
| 3 | Verse management | Admin can create an unpublished KJV-backed verse, enrich and publish it; a Player cannot invoke the mutation. | Passed — project-owner manual verification on 2026-08-29. |
| 4 | Waypoint assignment | The same verse can occupy different permanent waypoints with different Journey Stages; a hidden waypoint without learner history can be unassigned, while published or history-linked waypoints reject unassignment. | Passed — project-owner manual verification on 2026-08-29. |
| 5 | Journey Stage rules | From `/admin/waypoints`, use **Journey Stage testing** to launch an assigned Learn waypoint and confirm Test hint is available with no timer; launch Recall and confirm a 5-minute server attempt; launch Strengthen and Master and confirm no hint control with 3-minute and 2-minute attempts. Return to the waypoint list after each test and verify no learner progress, rewards, streak, badges, flames, cooldown, or hint balance changed. | Passed — project-owner manual verification on 2026-08-31. |
| 6 | Three-Day Challenge | Five Glimmer modes complete the day, add one flame, and place Glow behind its 24-hour server cooldown. | Passed — project-owner manual verification on 2026-08-31. |
| 7 | Cooldown bypass | From the Day Selection **Admin testing** menu, **Verify server lock** calls the real session-start action while the client card remains locked. Only the server's specific `PRG-004` cooldown response produces the successful verification notice; no day or session starts. | Passed — project-owner manual verification on 2026-08-31. |
| 8 | Radiance completion | The third flame, Glow reward, waypoint completion, next published waypoint unlock, immediate next Glimmer readiness, and completed-verse Vault/Sanctuary access occur together. | Passed — project-owner manual verification on 2026-08-31. |
| 9 | Duplicate reward prevention | From the completed day's **Admin testing** menu, run **Verify duplicate protection**. The completed session must be terminal, duplicate Glow and Beacon ledger identities must be rejected inside forced-rollback probes, and balances must remain unchanged. | Passed — project-owner manual verification on 2026-08-31. |
| 10 | Badge trigger | On a completed Learn waypoint, open **Admin testing** and run **Verify First Steps badge**. The read-only check must confirm trusted Learn completion, exactly one completed First Steps record, and exactly one matching Glow reward ledger. The live completion sequence remains mode success → badge celebration → streak celebration. | Not run |
| 11 | Hint accounting | Learn hint use decrements once; Strengthen and Master reject direct hint attempts server-side. | Not run |
| 12 | Oil Shop | A purchase deducts Glow and grants hints atomically; insufficient balance cannot become negative. | Not run |
| 13 | Leaderboard privacy | League, country, and Fellowship views reveal no email address or private identifier. | Not run |
| 14 | Private notes | A second account cannot read or mutate the first account's Sanctuary note. | Not run |
| 15 | Mobile gameplay | At 375px, all five modes remain readable and touch interactions complete without clipping or accidental scrolling. | Not run |
| 16 | Vault replay | A four-stage mastered verse replays all five Radiance modes without hints/timer/rewards/progression changes and returns to the Vault. | Not run |

## Deferred natural-time checks

These checks cannot be accepted from a shortened admin clock alone:

- A genuine next learner-local calendar day increments the streak exactly once.
- A missed learner-local calendar day resets the current streak while preserving
  the best streak.
- Weekly Beacon XP and league placement finalize at Monday 00:00 UTC without
  timezone-dependent advantages.

## Test-data safety

- Use only local development accounts and the dedicated integration database.
- Never run destructive fixtures against the routine development or hosted
  production database.
- Reset one learner through the guarded local progress-reset command when a flow
  needs a fresh campaign; do not delete Better Auth identity or credentials.
- Record a defect as Failed only after it reproduces independently of stale
  `.next` output, browser extensions, and test-database connectivity.
