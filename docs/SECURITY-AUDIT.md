# Scripture Memo — Security Audit Checklist
**Version:** 2.0  
**Purpose:** Use this document before, during, and after implementation to verify the security posture of the Scripture Memo application. Every checklist item must be reviewed before any production deployment is approved.

---

## Security Summary

Scripture Memo includes authentication, role-based admin content management, user progression with cooldown enforcement, Glow Points rewards, a Badge System, hints, an Oil Shop with purchases, Fellowships, and public Leaderboards.

The most critical security risks are:

1. Unauthorized admin access through missing role checks in Server Actions.
2. Client-side manipulation of progression, cooldowns, and reward values.
3. Duplicate reward claims through race conditions or repeated requests.
4. Data leakage of user email addresses through public leaderboard queries.
5. Unsafe user-generated content (fellowship names, display names, private notes).
6. Privilege escalation via insufficient role hierarchy enforcement.
7. Journey Stage rule bypass (using hints during Strengthen/Master stages).

The server and database are the only sources of truth for all security-sensitive decisions. The client is never trusted for auth, roles, cooldowns, game completion, points, or Journey Stage enforcement.

---

## Risk Rating Key

| Rating | Meaning |
|---|---|
| 🔴 Critical | Must fix before any deployment. Blocks all releases. |
| 🟠 High | Must fix before production. Blocks production release. |
| 🟡 Medium | Should fix before public launch. Schedule fix. |
| 🟢 Low | Improve when possible. Does not block release. |

---

## Section 1 — Architecture Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 1.1 | Project uses root-based folder structure — no `src/` folder exists | 🟢 Low | ✅ Verified 2026-09-24 | Repository scan confirmed no `src/` directory |
| 1.2 | Route files in `app/` are one-line re-exports only — no logic | 🟡 Medium | ✅ Verified 2026-09-24 | All `page.tsx` route files are single-line re-exports; the auth handler and framework boundaries are intentional exceptions |
| 1.3 | Prisma is imported only inside repository files | 🟠 High | ✅ Verified 2026-09-24 | Source scan found no Prisma singleton imports outside repositories, `lib/prisma.ts`, or Better Auth adapter initialization |
| 1.4 | Server Actions never call Prisma directly — always call repositories | 🟠 High | ✅ Verified 2026-09-24 | Source scan found no Prisma imports in action files |
| 1.5 | No feature imports another feature's internal components, hooks, or views | 🟡 Medium | ✅ Verified 2026-09-24 | Cross-feature consumers now use feature-root public entry points. Generic confetti and audio feedback moved to shared locations; scans found no remaining cross-feature internal component, hook, or view imports |
| 1.6 | No empty or speculative folders exist in the project | 🟢 Low | ✅ Verified 2026-09-24 | Current source tree scan found no empty feature folders |
| 1.7 | Barrel files do not exist inside sub-folders (`actions/index.ts` etc.) | 🟢 Low | ✅ Verified 2026-09-24 | No sub-folder barrels found; feature-root entry files are intentional public feature surfaces |

---

## Section 2 — Authentication

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 2.1 | All protected routes require a valid session | 🔴 Critical | ✅ Verified 2026-09-24 | Proxy gates protected path prefixes and the protected shell resolves a server session before loading learner data |
| 2.2 | Unauthenticated users are redirected to `/login` by root-level Next.js 16 Proxy | 🟠 High | ✅ Verified 2026-09-24 | Root `proxy.ts` performs optimistic route checks; protected data and actions retain server-side checks |
| 2.3 | Auth cookies are secure, HTTP-only, and SameSite where supported | 🔴 Critical | ✅ Verified 2026-09-24 | Better Auth 1.6.23 uses HTTP-only cookies, secure cookies in production, and SameSite=Lax by default; confirm production HTTPS at deployment |
| 2.4 | Passwords are hashed by the auth provider — never stored in plaintext | 🔴 Critical | ✅ Verified 2026-09-24 | Better Auth 1.6.23 uses its built-in scrypt password hashing; the obsolete bcrypt cost-factor wording does not apply |
| 2.5 | Login errors use generic messages — do not reveal whether an email exists | 🟡 Medium | ✅ Verified 2026-09-24 | Login action returns a generic failure; registration still exposes success/failure status for a duplicate address until verification or equivalent is configured |
| 2.6 | Logout correctly destroys the server-side session | 🟠 High | ✅ Verified 2026-09-24 | `logoutAction` calls Better Auth `signOut` with the request headers |
| 2.7 | Password reset tokens expire within a reasonable time window | 🟠 High | ✅ Implemented | Better Auth reset tokens expire after 1 hour |
| 2.8 | Email verification is enforced for email/password registrations | 🟡 Medium | ☐ Pending | No mail provider or verification workflow is configured. Registration action status still distinguishes a duplicate address from a new account; owner must approve verification or accept this enumeration risk |
| 2.9 | After a password change, all existing sessions for that user are invalidated | 🟠 High | ✅ Implemented | Better Auth revokes sessions after successful reset |
| 2.10 | OAuth tokens are never stored in plaintext in the database | 🔴 Critical | N/A 2026-09-24 | No OAuth provider is configured; recheck before enabling OAuth |
| 2.11 | Development reset-link delivery cannot run in production | 🔴 Critical | ✅ Implemented | `LIGHT_DEV` throws under `NODE_ENV=production`; production requires the dedicated delivery adapter |

---

## Section 3 — Authorization and Role Enforcement

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 3.1 | All admin routes require ADMIN or SUPER_ADMIN — checked optimistically in Proxy | 🔴 Critical | ✅ Verified 2026-09-24 | Root `proxy.ts` guards `/admin`; `/admin/users` requires SUPER_ADMIN |
| 3.2 | All admin routes require ADMIN or SUPER_ADMIN — enforced in Server Actions | 🔴 Critical | ✅ Verified 2026-09-24 | Sensitive admin action files perform server-side role checks; Proxy is not their authorization boundary |
| 3.3 | Super Admin routes require SUPER_ADMIN — enforced in Proxy and again in actions | 🔴 Critical | ✅ Verified 2026-09-24 | User-role changes and manual badge grants recheck SUPER_ADMIN in their actions; Proxy also protects user management routes |
| 3.4 | Regular users cannot call verse create/update/delete/publish actions | 🔴 Critical | ✅ Verified 2026-09-24 | Verse mutation actions require ADMIN or SUPER_ADMIN |
| 3.5 | Regular users cannot call pack management actions | 🔴 Critical | ✅ Verified 2026-09-24 | Pack mutation actions require ADMIN or SUPER_ADMIN |
| 3.6 | Regular users cannot call waypoint management actions | 🔴 Critical | ✅ Verified 2026-09-24 | Waypoint mutation actions require ADMIN or SUPER_ADMIN |
| 3.7 | Regular users cannot call badge create/update/toggle actions | 🔴 Critical | ✅ Verified 2026-09-24 | Badge administration actions require ADMIN or SUPER_ADMIN |
| 3.8 | Only SUPER_ADMIN can call the manual badge award action | 🔴 Critical | ✅ Verified 2026-09-24 | `awardBadgeAction` validates input, checks SUPER_ADMIN, and writes actor-linked audit data transactionally |
| 3.9 | Only SUPER_ADMIN can change user roles | 🔴 Critical | ✅ Verified 2026-09-24 | Role-change action checks SUPER_ADMIN and repository writes the audit row atomically |
| 3.10 | Regular admins cannot call `overrideCooldownAction` for other admins | 🟠 High | ✅ Verified 2026-09-24 | Override derives identity from the session, limits self-testing scope, and records the override in AuditLog |
| 3.11 | Users cannot update another user's profile, settings, or progress | 🟠 High | ✅ Verified 2026-09-24 | Player actions derive the acting user ID from the authenticated server session |
| 3.12 | Fellowship admin actions check that the requestor is the fellowship LEADER | 🟠 High | ✅ Verified 2026-09-24 | Leader ownership is rechecked in repository mutations under transaction locks |
| 3.13 | Fellowship identity updates are leader-only and insignias use a fixed server-validated catalogue | 🟠 High | ✅ Implemented | Repository ownership filter and Zod enum reject non-leaders, uploads, and external image paths |

---

## Section 4 — Input Validation

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 4.1 | Every Server Action that accepts input validates it with Zod before any other logic | 🔴 Critical | ✅ Verified 2026-09-24 | AST/source scan covered 73 action files; the one translation lookup before validation was moved after safeParse |
| 4.2 | Verse reference fields are validated for format | 🟡 Medium | ✅ Verified 2026-09-24 | Server schema validates canonical book, chapter and verse bounds, then derives the stored reference |
| 4.3 | Translation codes are validated against the supported application enum | 🟡 Medium | ✅ Verified 2026-09-24 | Current persisted enum and action schemas validate supported codes; the checklist no longer assumes the original MVP translation set |
| 4.4 | Journey Stage values are enum-validated (LEARN/RECALL/STRENGTHEN/MASTER) | 🟠 High | ✅ Verified 2026-09-24 | Prisma enum types and strict action schemas reject unknown stage values |
| 4.5 | Game mode values are enum-validated using the GameMode enum | 🟠 High | ✅ Verified 2026-09-24 | Server derives the allowed next mode from the persisted enum order; `CUE` is a mode and HINT is separate |
| 4.6 | Waypoint positions are assigned and range-validated against the current server curriculum | 🟠 High | ✅ Verified 2026-09-24 | Position is assigned and checked against current server records; reorder input is a complete unique ID list, not a client-selected number. The curriculum is no longer fixed at 220 |
| 4.7 | Fellowship names and descriptions are length-limited | 🟡 Medium | ☑ Implemented | Zod constrains names to 3–50 safe characters and descriptions to 280 characters |
| 4.8 | User display names are length-limited and sanitized | 🟡 Medium | ✅ Verified 2026-09-24 | Settings schema trims, length-limits, and allow-lists display-name characters; React renders the value as escaped text |
| 4.9 | Private notes (Sanctuary) are length-limited | 🟡 Medium | ✅ Verified 2026-09-24 | Server schema trims and caps notes at 5,000 characters |
| 4.10 | Shop item IDs in purchase requests are validated server-side | 🟠 High | ✅ Verified 2026-09-24 | The repository reloads the requested active item and uses server-owned price and grant values inside the purchase transaction |
| 4.11 | Game completion payloads are validated — server independently computes which mode/day should be complete | 🔴 Critical | ✅ Verified 2026-09-24 | Completion evidence is validated and the server derives the next mode and day from persisted attempts/session state |
| 4.12 | Badge requirement fields are validated when creating/updating badges | 🟡 Medium | ✅ Verified 2026-09-24 | Save schema restricts criteria to a fixed enum and bounds target values to positive integers |

---

## Section 5 — Progression Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 5.1 | Waypoint unlock status is always computed server-side | 🔴 Critical | ✅ Implemented | Lazy initialization and next-waypoint selection run in the progression repository |
| 5.2 | Day unlock status is always computed server-side from stored timestamps | 🔴 Critical | ✅ Implemented | `isDayPlayable` is reapplied inside the guarded start transaction |
| 5.3 | Day 2 unlock requires Day 1 to be marked complete in the database | 🔴 Critical | ✅ Implemented | Progression transaction verifies the preceding persisted day |
| 5.4 | Day 3 unlock requires Day 2 to be marked complete in the database | 🔴 Critical | ✅ Implemented | Progression transaction verifies the preceding persisted day |
| 5.5 | 24-hour cooldown is calculated from the stored `completedAt` timestamp — never from client time | 🔴 Critical | ✅ Implemented | Server-derived completion time plus exact elapsed UTC hours; client countdowns remain display-only |
| 5.6 | `overrideCooldownAction` requires ADMIN or SUPER_ADMIN role | 🟠 High | ✅ Verified 2026-09-24 | Server role check, restricted self-test scope, and AuditLog transaction are in place |
| 5.7 | Completing Day 3 unlocks only the next currently published waypoint selected by the server | 🟠 High | ✅ Implemented | Database ordering is used rather than a client ID or an `N+1` assumption |
| 5.8 | Duplicate day completion is prevented by the unique `(userId, waypointId, dayLevel)` record, transaction lock, and completed-state check | 🔴 Critical | ✅ Implemented | Database and transactional defenses reject repeat or concurrent completion |
| 5.9 | Game mode completion order is enforced server-side (DRAG_DROP → PUZZLE → SWAP → CUE → FILL) | 🟠 High | ✅ Implemented | Session-locked start and completion transactions derive the sole current mode from persisted completed attempts |
| 5.10 | A day cannot be marked complete unless all five modes are recorded as complete | 🔴 Critical | ✅ Implemented | The completion transaction invokes day completion only when the ordered mode sequence has no next mode |
| 5.11 | Journey Stage hint rules are enforced server-side in `useHintAction` | 🔴 Critical | ✅ Verified 2026-09-24 | Repository rechecks the owned active session's stage inside the consumption transaction and rejects STRENGTHEN/MASTER |
| 5.12 | Journey Stage time limit rules are enforced server-side | 🟠 High | ✅ Complete | Per-mode limits are Recall 5m, Strengthen 3m, Master 2m; persisted attempt time is authoritative and client timers are display-only |

---

## Section 6 — Glow Points and Rewards Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 6.1 | Glow Points are awarded server-side only — client never sends a point amount | 🔴 Critical | ✅ Verified 2026-09-24 | Completion action accepts answer evidence only; server reward constants determine the award |
| 6.2 | Day 1/2/3 multipliers are calculated server-side using constants | 🟠 High | ✅ Verified 2026-09-24 | Reward repository calculates amount from the validated persisted day level |
| 6.3 | Every point award inserts a `RewardLedger` record in the same transaction | 🟠 High | ✅ Verified 2026-09-24 | The ledger insert and balance increment share the gameplay transaction |
| 6.4 | Duplicate reward claims are prevented by unique DB constraint + transaction | 🔴 Critical | ✅ Verified 2026-09-24 | Progression transaction guards completion and the unique reward idempotency key rejects duplicate awards |
| 6.5 | Badge Glow Point rewards are awarded server-side via the badge engine | 🟠 High | ✅ Verified 2026-09-24 | Badge engine computes the reward from server-side definitions and writes ledger plus balance atomically |
| 6.6 | Glow Points are the only spendable currency | 🟢 Low | ✅ Verified 2026-09-24 | Beacon XP and Crowns are non-spendable progression/prestige; only Glow Points are accepted by Oil Shop purchase logic |
| 6.7 | Oil Shop purchases use a database transaction — balance + inventory + ledger updated atomically | 🔴 Critical | ✅ Complete | Per-user advisory lock, purchase snapshot, guarded deduction, and negative ledger row commit together |
| 6.8 | Oil Shop purchase prevents negative Glow Points balance | 🔴 Critical | ✅ Complete | Conditional profile update requires the persisted balance to cover the server-owned item cost |
| 6.9 | Users cannot purchase inactive or non-existent shop items | 🟡 Medium | ✅ Complete | Transaction re-reads active item type, cost, and grant quantity; the client supplies no reward values |

---

### Beacon progression security addendum

- Glow Points are the only spendable currency. Beacon XP and Crowns are
  non-spendable progression values and must never be accepted from the client.
- Every Beacon XP award uses a server-owned amount, immutable idempotency key,
  per-user transaction lock, and the same transaction as verified completion.
- Weekly placement uses the server completion timestamp and the global Monday
  00:00 UTC boundary; client clocks and displayed local time are informational.
- Replays, Vault review, admin testing, and failed attempts never create XP.

## Section 7 — Badge System Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 7.1 | Badge progress is always calculated server-side by the badge engine | 🔴 Critical | ✅ Complete | Absolute metrics are derived from trusted session, waypoint, streak, attempt, and assistance history |
| 7.2 | Badge unlock fires exactly once per badge per user — prevented by unique constraint | 🔴 Critical | ✅ Complete | Unique `(userId, badgeId)`, advisory locking, and ledger idempotency jointly protect retries |
| 7.3 | Glow Points from badge unlock are awarded through the same reward transaction | 🟠 High | ✅ Complete | Progress, ledger entry, and profile balance commit atomically with gameplay completion |
| 7.4 | Manual badge award (`awardBadgeAction`) requires SUPER_ADMIN role | 🔴 Critical | ✅ Complete | Validation, authentication, and role checks run inside the Server Action |
| 7.5 | Every manual badge award is recorded in `AuditLog` | 🟠 High | ✅ Complete | Grant and actor-linked audit row share one transaction |
| 7.6 | Disabled badges cannot be unlocked by players | 🟡 Medium | ✅ Complete | Evaluation queries only active badge definitions |
| 7.7 | Hidden badges are not revealed in API responses until unlocked | 🟡 Medium | ✅ Complete | Repository masks name, slug, description, and icon before client delivery |
| 7.8 | Administrator-created badges use controlled criteria and audited writes | 🟠 High | ✅ Complete | Unsupported future criteria are forced paused; definition create/edit and status changes write actor-linked audit records |
| 7.9 | Earned badges cannot be deleted | 🔴 Critical | ✅ Complete | Repository transaction rechecks completed unlock count; unearned deletion removes partial progress and writes an audit record |

---

## Section 8 — Gameplay Integrity

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 8.1 | Answer validation normalizes both user input and stored `normalizedText` before comparing | 🟡 Medium | ✅ Verified 2026-09-24 | Shared validator applies Unicode normalization, case folding, punctuation removal, and whitespace normalization to both values |
| 8.2 | `normalizedText` is generated server-side when a translation is saved — never client-generated | 🟠 High | ✅ Verified 2026-09-24 | Verse repository derives normalized comparison text from the submitted canonical translation before persistence |
| 8.3 | Swap mode tracks token positions, not word text values | 🟡 Medium | ✅ Verified 2026-09-24 | Swap state retains original token indexes so repeated words remain distinct |
| 8.4 | Phrase generator is deterministic for a given input set | 🟢 Low | ✅ Verified 2026-09-24 | Session/day seed controls phrase chunk layout; retries reproduce the same arrangement |
| 8.5 | Each `GameSession` belongs to the authenticated user — server validates ownership | 🔴 Critical | ✅ Verified 2026-09-24 | Gameplay repositories scope session reads and writes by the server-derived user ID |
| 8.6 | Completed game mode sessions cannot be submitted again for additional rewards | 🔴 Critical | ✅ Verified 2026-09-24 | Completion transaction locks and checks persisted attempts before recording progress or rewards |
| 8.7 | Hint usage is validated against the current Journey Stage server-side | 🔴 Critical | ✅ Verified 2026-09-24 | Hint repository verifies session ownership and stage under the consumption transaction; STRENGTHEN and MASTER are rejected |
| 8.8 | Hint balance is enforced server-side — free allowance + purchased hints only | 🟡 Medium | ✅ Verified 2026-09-24 | Repository derives remaining allowance from persisted use and purchased entitlements inside a locked transaction |
| 8.9 | Hint usage is recorded in `HintUsage` with session reference | 🟡 Medium | ✅ Verified 2026-09-24 | Every real consumption creates a `HintUsage` row with its game session and current mode |
| 8.10 | `CUE` mode is distinct from the Hint System — Cue Mode inputs are never blocked by hint count | 🟡 Medium | ✅ Verified 2026-09-24 | Cue is in the server-enforced game-mode sequence; assistance consumption is a separate repository and action |
| 8.11 | Vault replay is ownership-checked, mastery-gated, ordered, and isolated from campaign side effects | 🔴 Critical | ✅ Complete | Server-created Radiance replay sessions validate all five modes; no rewards, streaks, hints, cooldowns, or waypoint progression are written |

---

## Section 9 — Data Privacy

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 9.1 | Leaderboard queries never return user email addresses | 🔴 Critical | ☑ Implemented | Phase 27 repository maps internal rows to display name, country, rank, and game statistics; raw IDs become an `isCurrentUser` boolean before leaving the repository |
| 9.2 | Fellowship member lists never expose user emails | 🔴 Critical | ☑ Implemented | Fellowship DTOs return display name, country, and game statistics only; no email or raw user ID |
| 9.3 | Public profile data is limited to display name, country, and game stats | 🟠 High | ✅ Verified 2026-09-24 | Public leaderboard and fellowship DTOs omit email and internal account identifiers |
| 9.4 | Private Sanctuary notes are visible only to the note's owner | 🔴 Critical | ✅ Verified 2026-09-24 | Note reads and writes include the server-derived owner ID in repository predicates |
| 9.5 | Admin user management list is accessible only to SUPER_ADMIN | 🔴 Critical | ✅ Verified 2026-09-24 | Proxy and server data/action paths require SUPER_ADMIN |
| 9.6 | Audit logs are readable only by SUPER_ADMIN | 🟠 High | ✅ Verified 2026-09-24 | Audit-log query actions require SUPER_ADMIN before repository access |
| 9.7 | Production error messages do not reveal stack traces, schema details, or Prisma errors | 🟠 High | ✅ Verified 2026-09-24 | Action catch blocks return fixed/catalogue messages; errors are logged server-side and are not interpolated into client responses |
| 9.8 | Server logs never contain passwords, session tokens, or secret values | 🔴 Critical | ✅ Verified 2026-09-24 | Logger now redacts common credential assignments, bearer tokens, and URL credentials; production omits error stacks. Feature log calls were source-reviewed |
| 9.8A | Auth forms use POST as their native fallback so missing client JavaScript cannot place credentials in URLs or access logs | 🔴 Critical | ✅ Implemented | Login remains a Better Auth-backed Server Action after hydration |
| 9.9 | Hidden badge names and descriptions are omitted from API responses for locked+hidden badges | 🟡 Medium | ✅ Verified 2026-09-24 | Badge response mapper masks name, slug, description, and icon until the hidden badge is unlocked |

---

## Section 10 — User-Generated Content

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 10.1 | Fellowship names are sanitized and escaped before rendering in the UI | 🟡 Medium | ☑ Implemented | Zod allow-list validation plus React text rendering prevents markup execution |
| 10.2 | Fellowship descriptions are sanitized and escaped before rendering | 🟡 Medium | ☑ Implemented | Length-limited plain text is rendered only through escaped React text nodes |
| 10.3 | User display names are sanitized and escaped before rendering | 🟡 Medium | ✅ Verified 2026-09-24 | Settings schema allow-lists characters and UI outputs use React text rendering |
| 10.4 | Sanctuary private notes are sanitized and escaped before rendering | 🟡 Medium | ✅ Verified 2026-09-24 | Note text is length-limited and rendered as escaped React text; it is never treated as HTML or Markdown |
| 10.5 | Markdown or HTML rendering is never applied to user-generated content unless sanitized | 🟠 High | ✅ Verified 2026-09-24 | Sanctuary Markdown renders administrator-authored study content; learner notes remain plain escaped text |
| 10.6 | Length limits are enforced server-side (Zod) for all user-generated fields | 🟡 Medium | ✅ Verified 2026-09-24 | Verse content, Fellowship fields, profile names, private notes, badge definitions, and admin-authored study sections have explicit schema bounds |
| 10.7 | User content is never passed to `dangerouslySetInnerHTML` | 🟠 High | ✅ Verified 2026-09-24 | The sole use is a fixed project-authored JSON-LD object on the landing page; it contains no user content |

---

## Section 11 — Rate Limiting and Abuse Prevention

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 11.1 | Login attempts are rate-limited per IP (e.g., 10 per 15 minutes) | 🟠 High | ✅ Verified 2026-09-24 | Better Auth database-backed limit: 10 sign-in attempts per IP per 15 minutes; deployment proxy/IP trust still needs host-specific verification |
| 11.2 | Registration attempts are rate-limited per IP | 🟡 Medium | ✅ Verified 2026-09-24 | Better Auth database-backed limit: 5 sign-ups per IP per hour; deployment proxy/IP trust still needs host-specific verification |
| 11.3 | Password reset requests are rate-limited per email | 🟠 High | ✅ Verified 2026-09-24 | Action uses a Better Auth secret-keyed HMAC of the normalized address in the existing `RateLimit` table, with an atomic PostgreSQL lock and five requests per fixed 15-minute window; the dedicated local integration test passed, and Better Auth also limits by IP |
| 11.4 | Game completion submissions are protected against rapid repeated calls | 🟡 Medium | ✅ Verified 2026-09-24 | Transaction lock, completed-state check, and database uniqueness make repeated completion requests fail safely |
| 11.5 | Hint usage action is rate-limited or guarded against rapid fire requests | 🟢 Low | ✅ Verified 2026-09-24 | Hint-balance lock and transaction recheck prevent rapid calls from consuming beyond persisted allowance |
| 11.6 | Fellowship creation is rate-limited per user | 🟡 Medium | ☑ Implemented | Per-user advisory locking and a maximum of three creations per rolling 24 hours prevent rapid spam |
| 11.7 | Private Fellowship requests are unique and leader-authorized | 🟠 High | ✅ Verified 2026-09-24 | One durable request per learner/fellowship prevents duplicate pending requests; repository ownership checks and locked transactions protect approval and membership creation |
| 11.8 | Admin bulk actions are confirmation-gated in the UI | 🟡 Medium | ✅ Verified 2026-09-24 | CSV import requires explicit preview confirmation; destructive per-record admin mutations use confirmation controls |
| 11.9 | Production client IP rate limits trust only forwarding headers from the selected hosting proxy | 🟠 High | ☐ Pending | The hosting provider is not selected; forwarded-header trust and `getRequestIp` must be verified against its proxy contract before launch |

---

## Section 12 — Database Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 12.1 | `DATABASE_URL` is stored only in environment variables — never committed to source control | 🔴 Critical | ✅ Verified 2026-09-24 | Local `.env` exists, is ignored, and is not tracked; Git history contains only the placeholder `.env.example` |
| 12.2 | Unique constraint exists on `UserDayProgress (userId, waypointId, dayLevel)` | 🔴 Critical | ✅ Verified 2026-09-24 | Prisma schema declares the composite unique constraint used by progression completion |
| 12.3 | Unique constraint exists on `UserBadgeProgress (userId, badgeId)` | 🔴 Critical | ✅ Verified 2026-09-24 | Prisma schema declares the composite unique constraint used by badge unlock idempotency |
| 12.4 | `RewardLedger` records are never deleted or updated — insert only | 🟠 High | ✅ Verified 2026-09-24 | Production reward paths append ledger rows only; deletion is limited to guarded local test/fixture reset repositories |
| 12.5 | Foreign key relations are defined and enforced in the Prisma schema | 🟠 High | ✅ Verified 2026-09-24 | Prisma relations use database foreign keys with explicit referential actions |
| 12.6 | Cascading deletes are explicitly reviewed — no accidental data loss | 🟠 High | ✅ Verified 2026-09-24 | Curriculum/verse history relations restrict destructive deletes; retained cascade behavior is limited to owned dependent records |
| 12.7 | Indexes exist on `(userId, waypointId)` for progress queries | 🟡 Medium | ✅ Verified 2026-09-24 | `UserDayProgress` has the compound index and unique key used by learner progress reads |
| 12.8 | Indexes exist on `(totalGlowPoints DESC)` and `(currentStreak DESC)` for leaderboard queries | 🟡 Medium | ☑ Implemented | `UserProfile` and `UserStreak` include descending leaderboard indexes; country also has a composite ranking index |
| 12.9 | Database transactions are used for security-sensitive multi-write operations | 🔴 Critical | ✅ Verified 2026-09-24 | Source review confirmed completion/unlock, Glow and badge awards, shop purchases, role changes, and audited admin mutations use repository transactions; one-write operations remain atomic single statements |
| 12.10 | The database user in `DATABASE_URL` has only the permissions needed (not superuser) | 🟠 High | ☐ Pending | Principle of least privilege |
| 12.11 | `prisma migrate dev` is never run against the production database | 🔴 Critical | ☐ Pending | The repository has no production deployment workflow or configured production database to verify. Local startup and the guarded test migration wrapper use `prisma migrate deploy`; require the selected host's production release process to run only `prisma migrate deploy` and verify that before launch. |

---

## Section 13 — Environment and Secrets Management

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 13.1 | `.env` is listed in `.gitignore` | 🔴 Critical | ✅ Verified 2026-09-24 | Ignore rules cover local environment files; `.env` is not tracked |
| 13.2 | `.env.example` exists with placeholder values only — no real secrets | 🟡 Medium | ✅ Verified 2026-09-24 | Example contains local placeholder URLs and a placeholder auth secret only |
| 13.3 | Auth secret is cryptographically random and at least 32 characters | 🔴 Critical | ✅ Verified 2026-09-24 | Local secret length was checked without exposing its value; it meets the minimum length. Production secret remains unconfigured until deployment |
| 13.4 | Production and development/staging secrets are completely separate | 🟠 High | ☐ Pending | No shared secrets across environments |
| 13.5 | All `NEXT_PUBLIC_*` environment variables are reviewed — none contain secrets | 🔴 Critical | ✅ Verified 2026-09-24 | Only `NEXT_PUBLIC_APP_URL` is declared and it is a public URL, not a credential |
| 13.6 | Secrets are rotated immediately if a `.env` file is ever accidentally committed | 🔴 Critical | ✅ Verified 2026-09-24 | No secret-bearing environment file appears in tracked files or repository history; any future exposure requires immediate rotation |

---

## Section 14 — Frontend Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 14.1 | Client components never contain secrets or sensitive configuration | 🔴 Critical | ✅ Verified 2026-09-24 | Client-source environment references are limited to public configuration; server secrets remain in server modules |
| 14.2 | Client state is never trusted for authorization decisions | 🔴 Critical | ✅ Verified 2026-09-24 | Server Actions and repositories re-check session, role, ownership, progress, and purchase state at mutation boundaries |
| 14.3 | Form submit buttons are disabled during submission to prevent double-submit | 🟡 Medium | ✅ Verified 2026-09-24 | Shared LoadingButton and form transitions expose pending labels and disable repeat submits |
| 14.4 | Sonner toast messages never expose stack traces, raw Prisma errors, secrets, private data, or internal IDs | 🟡 Medium | ✅ Verified 2026-09-24 | Phase 31 toast audit reviewed player-facing action and error copy; failures use fixed messages or safe catalogue entries |
| 14.5 | Error boundaries render safe, generic messages — no internal stack traces | 🟡 Medium | ✅ Verified 2026-09-24 | App error boundaries show generic recovery UI and do not render underlying error objects |
| 14.6 | `prefers-reduced-motion` preference is respected — animations disabled when set | 🟢 Low | ✅ Verified 2026-09-24 | OS preference and saved in-app preference both reach Framer Motion; independent and combined manual checks were accepted in Phase 31 |
| 14.7 | Security headers are configured in `next.config.ts` | 🟡 Medium | ✅ Verified 2026-09-25 | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy are configured. Proxy enforces the per-document nonce-based CSP; same-origin lazy chunks are allowed, with three exact inline style hashes observed in review (two from Sonner 2.0.7 and one from the Settings theme flow). Zod browser schemas use `jitless` to avoid eval probing. Owner confirmed `/game/map`, `/`, `/login`, `/register`, the prepared gameplay preview, Oil Shop tab switching, and Light/Dark/System changes in Settings worked with no Console CSP violations after enforcement. A DevTools eval issue seen in the regular browser profile disappeared in Incognito with extensions disabled; no `unsafe-eval` allowance was added. |
| 14.8 | Error-reference entries are safe for browser delivery and the reference route verifies ADMIN authorization server-side | 🟡 Medium | ✅ Verified 2026-09-24 | Reference is generated from the safe error catalogue and the route/action performs server role checks |

Recommended security headers configuration:
```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
```

---

## Section 15 — Admin Panel Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 15.1 | Admin dashboard is protected by ADMIN or SUPER_ADMIN role at Proxy level | 🔴 Critical | ✅ Verified 2026-09-24 | Root Proxy protects admin routes and applies the stricter SUPER_ADMIN rule to user management |
| 15.2 | Admin dashboard is protected by ADMIN or SUPER_ADMIN role at action and data-access level | 🔴 Critical | ✅ Verified 2026-09-24 | Admin actions and data loaders perform server-side role checks independently of Proxy |
| 15.3 | Verse create/update/publish actions check ADMIN+ role | 🔴 Critical | ✅ Verified 2026-09-24 | Every verse mutation checks administrator role before repository writes |
| 15.4 | Pack create/update/publish actions check ADMIN+ role | 🔴 Critical | ✅ Verified 2026-09-24 | Every pack mutation checks administrator role before repository writes |
| 15.5 | Waypoint create/assign/reorder actions check ADMIN+ role | 🔴 Critical | ✅ Verified 2026-09-24 | Every curriculum mutation checks administrator role before repository writes |
| 15.6 | Badge create/update/toggle actions check ADMIN+ role | 🔴 Critical | ✅ Verified 2026-09-24 | Every badge-definition mutation checks administrator role before repository writes |
| 15.7 | User role changes require SUPER_ADMIN and are logged | 🔴 Critical | ✅ Verified 2026-09-24 | Role-change action requires SUPER_ADMIN; role update and actor-linked audit row commit in one repository transaction |
| 15.8 | Cooldown override actions require ADMIN+ and are logged in AuditLog | 🟠 High | ☑ Implemented | Self-testing only; server derives the affected admin identity and atomically logs actor, day progress, timing, scope, and request IP |
| 15.9 | Manual badge awards require SUPER_ADMIN and are logged in AuditLog | 🔴 Critical | ✅ Verified 2026-09-24 | Manual award action requires SUPER_ADMIN and repository records the actor-linked audit row transactionally |
| 15.10 | Destructive admin actions (delete verse, archive waypoint) require confirmation dialog | 🟡 Medium | ✅ Verified 2026-09-24 | Verse status, waypoint deletion/visibility, unassignment, and account deletion use confirmation controls |
| 15.11 | Admin audit log is readable only by SUPER_ADMIN | 🟠 High | ✅ Verified 2026-09-24 | Audit-log reader checks SUPER_ADMIN before repository access |

---

## Section 16 — Deployment Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 16.1 | Production build passes `tsc --noEmit` with zero errors | 🟠 High | ✅ Verified 2026-09-24 | `npx tsc --noEmit` passed during this audit; full production build remains a separate deployment check |
| 16.2 | Lint passes with zero errors | 🟡 Medium | ✅ Verified 2026-09-24 | Full ESLint command passed during this audit |
| 16.3 | No `console.log` debug statements remain — use `lib/logger.ts` | 🟡 Medium | ✅ Verified 2026-09-24 | No application-source debug logs found; the only remaining call prints local integration database startup status |
| 16.4 | No `any` types exist in the codebase | 🟠 High | ✅ Verified 2026-09-24 | Explicit TypeScript `any` annotation/cast scan found no matches |
| 16.5 | HTTPS is enforced by the hosting provider — no plain HTTP in production | 🔴 Critical | ☐ Pending | Transport security |
| 16.6 | Database connection uses SSL in production | 🟠 High | ☐ Pending | Transport encryption for DB connections |
| 16.7 | Database is not publicly accessible — only accessible from the application server | 🟠 High | ☐ Pending | Network-level protection |
| 16.8 | `NODE_ENV=production` is set in the deployment environment | 🟠 High | ☐ Pending | Disables Prisma query logging, enables production optimizations |
| 16.9 | Database backup strategy is in place | 🟡 Medium | ☐ Pending | Recovery planning |
| 16.10 | npm audit shows no critical or high vulnerabilities | 🟠 High | ☐ Pending | Registry audit was blocked by automatic approval review because it would disclose dependency names and versions to the public npm registry; explicit owner approval is pending |
| 16.11 | Dependency versions are pinned or regularly audited | 🟡 Medium | ✅ Verified 2026-09-24 | `package-lock.json` pins the installed dependency graph; vulnerability audit remains a separate deployment gate |

---

## Section 17 — Manual Security Test Cases

Execute all of these test cases before approving any production deployment.

### Test 1 — Unauthenticated Route Access
1. Log out completely.
2. Visit `/game/map` directly in the browser.
3. **Expected:** Redirected to `/login`. The map page does not render.

### Test 2 — Non-Admin Admin Route Access
1. Log in as a regular user (role: USER).
2. Visit `/admin/verses` directly.
3. **Expected:** Blocked or redirected. Admin dashboard does not render.

### Test 3 — Direct Server Action Privilege Bypass
1. Log in as a regular user.
2. Attempt to call the `createVerseAction` or `deleteVerseAction` directly (via crafted request or client-side call).
3. **Expected:** Action returns `{ success: false, message: 'Insufficient permissions.' }`. No verse is created or deleted.

### Test 4 — Cooldown Bypass Attempt
1. Log in as a regular user.
2. Complete Day 1 of Waypoint 1.
3. Attempt to start Day 2 immediately (before 24 hours) — either through UI or direct Server Action call.
4. **Expected:** Server rejects the request. Day 2 session does not start. User sees an appropriate error message.

### Test 5 — Client Timer Manipulation
1. Complete Day 1.
2. Inspect and modify local browser state, cookies, or React state to make the UI show Day 2 as "ready."
3. Click the Start button for Day 2.
4. **Expected:** Server independently checks the timestamp and blocks the request. Client-side state manipulation has no effect.

### Test 6 — Duplicate Reward Attempt
1. Complete Day 1 of a waypoint.
2. Immediately attempt to submit the Day 1 completion action a second time (simulate a double-click or repeat request).
3. **Expected:** Only one `RewardLedger` record exists for this day. Points are not doubled. The second request is rejected gracefully.

### Test 7 — Journey Stage Hint Bypass (Strengthen/Master)
1. Progress to a Strengthen or Master stage waypoint.
2. Confirm the Hint button is not rendered in the UI.
3. Attempt to call `useHintAction` directly for this waypoint (via crafted request).
4. **Expected:** Action returns an error. The hint is not used. The hint count does not decrement. The verse text is not returned.

### Test 8 — Journey Stage Hint Availability (Learn/Recall)
1. Play a Learn or Recall stage waypoint.
2. Confirm the Hint button is rendered and shows the correct count.
3. Use a hint.
4. **Expected:** Hint modal opens with correct verse, count decrements, toast fires "Hint used."

### Test 9 — Leaderboard Email Privacy
1. Register multiple test accounts.
2. Visit the Global Leaderboard.
3. Inspect the page source and all network responses.
4. **Expected:** No email address appears anywhere in the rendered HTML or API responses.

### Test 10 — Private Note Ownership
1. Log in as User A. Navigate to a completed verse in the Sanctuary. Write a private note. Save it.
2. Log in as User B.
3. Attempt to access User A's note by visiting the same verse Sanctuary page.
4. Attempt to call a "get note" action with User A's note ID.
5. **Expected:** User B sees no note for User A. The action returns an ownership error.

### Test 11 — Oil Shop Negative Balance
1. Log in as a user with 0 Glow Points.
2. Attempt to purchase a shop item.
3. **Expected:** Purchase fails. Balance remains at 0. User sees "Not enough Glow Points" error toast. No inventory record is created.

### Test 12 — Game Mode Order Enforcement
1. Start a game session for Day 1 of any waypoint.
2. Attempt to call `completeGameModeAction` for `FILL` mode without having completed the four preceding modes.
3. **Expected:** Action rejects the request. No completion is recorded for Fill mode.

### Test 13 — Badge Duplicate Prevention
1. Complete the criteria for a badge.
2. Confirm the badge is unlocked and Glow Points are awarded.
3. Complete the same criteria again (e.g., complete the same waypoint by resetting test data and replaying).
4. **Expected:** Badge unlock fires only once. Glow Points from the badge are awarded only once.

### Test 14 — Manual Badge Award Audit Trail
1. Log in as Super Admin.
2. Manually award a badge to a test user via the admin panel.
3. Check the AuditLog.
4. **Expected:** An AuditLog entry exists recording: which admin performed the action, which user received the badge, which badge, and the timestamp.

### Test 15 — Mobile Gameplay Completeness
1. Open the application on a mobile device or browser emulator (375px width).
2. Play through one complete day: all five modes.
3. **Expected:** Drag & Drop and Puzzle modes work via tap-to-select and tap-to-place. Swap mode works via tap. Cue and Fill modes use the mobile keyboard. All modes complete successfully. Confetti and toasts display correctly.

---

## Section 18 — Critical Fix Log Template

Use this template to document and track any security issues found during development or audit:

```
Issue ID:
Discovered by:
Date discovered:
Risk level: [Critical / High / Medium / Low]
Affected files:
Description:
  Clear explanation of the vulnerability or gap.
Reproduction steps:
  How to reproduce the issue.
Fix implemented:
  What was changed and in which files.
Retest result:
  Confirm the issue is resolved.
Status: [Open / In Progress / Resolved / Accepted Risk]
Accepted risk justification (if applicable):
```

---

## Section 19 — Production Approval Checklist

**Do not approve production deployment until every item in this checklist is confirmed.**

### Architecture
- [ ] No `src/` folder exists.
- [ ] All route files are one-line re-exports.
- [ ] No Prisma access exists outside repository files.
- [ ] No Server Action calls Prisma directly.

### Security
- [ ] All Critical items in Sections 1–17 are resolved.
- [ ] All High items in Sections 1–17 are resolved (or accepted with written justification).
- [ ] Auth and role checks verified in every sensitive Server Action.
- [ ] Cooldown enforcement confirmed to be server-side.
- [ ] Reward duplication prevented by constraint and transaction.
- [ ] Journey Stage hint rules enforced server-side.
- [ ] User email addresses are not exposed in any public query.
- [ ] `AuditLog` records all admin privilege actions.

### Code Quality
- [ ] `tsc --noEmit` passes with zero errors.
- [ ] Lint passes with zero errors.
- [ ] No `any` type exists in the codebase.
- [ ] No `console.log` debug statements remain.
- [ ] `GameMode.CUE` is used — `HINT` does not appear as a game mode.
- [ ] No XP or experience point references exist.

### Environment
- [ ] `.env` is in `.gitignore` and has not been committed.
- [ ] All required environment variables are set in the deployment platform.
- [ ] `NODE_ENV=production` is set.
- [ ] HTTPS is enforced.
- [ ] Database is on a private network.
- [ ] `npm audit` shows no critical or high vulnerabilities.

### Manual Tests
- [ ] All 15 manual security test cases in Section 17 have been executed and passed.
- [ ] Mobile gameplay has been tested on a real or emulated device.
- [ ] All five game modes complete successfully end-to-end.
- [ ] Badge unlock celebration fires correctly.
- [ ] Leaderboard privacy confirmed — no emails visible.

---

*Security is not a feature. It is a baseline requirement. No item in this document is optional.*

*Last reviewed: v2.0 — review and update before every major release.*
