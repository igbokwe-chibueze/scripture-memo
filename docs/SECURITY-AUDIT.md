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
| 1.1 | Project uses root-based folder structure — no `src/` folder exists | 🟢 Low | ☐ Pending | Required by project standard |
| 1.2 | Route files in `app/` are one-line re-exports only — no logic | 🟡 Medium | ☐ Pending | Business logic in route files is untestable and bypasses Server Action guards |
| 1.3 | Prisma is imported only inside repository files | 🟠 High | ☐ Pending | Uncontrolled Prisma access bypasses repository abstractions and makes queries untestable |
| 1.4 | Server Actions never call Prisma directly — always call repositories | 🟠 High | ☐ Pending | Same risk as above |
| 1.5 | No feature imports another feature's internal components, hooks, or views | 🟡 Medium | ☐ Pending | Tight coupling breaks feature isolation and makes refactoring dangerous |
| 1.6 | No empty or speculative folders exist in the project | 🟢 Low | ☐ Pending | Project clarity and maintainability |
| 1.7 | Barrel files do not exist inside sub-folders (`actions/index.ts` etc.) | 🟢 Low | ☐ Pending | Barrel files inside sub-folders can cause circular dependency issues |

---

## Section 2 — Authentication

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 2.1 | All protected routes require a valid session | 🔴 Critical | ☐ Pending | Game, map, vault, sanctuary, oil shop, fellowships, leaderboard, settings |
| 2.2 | Unauthenticated users are redirected to `/login` by root-level Next.js 16 Proxy | 🟠 High | ☐ Pending | Proxy performs optimistic checks in the Node.js runtime; secure checks remain close to protected data |
| 2.3 | Auth cookies are secure, HTTP-only, and SameSite where supported | 🔴 Critical | ☐ Pending | Depends on auth provider configuration |
| 2.4 | Passwords are hashed by the auth provider — never stored in plaintext | 🔴 Critical | ☐ Pending | Must use bcrypt or equivalent with minimum cost factor 12 |
| 2.5 | Login errors use generic messages — do not reveal whether an email exists | 🟡 Medium | ☐ Pending | Account enumeration prevention |
| 2.6 | Logout correctly destroys the server-side session | 🟠 High | ☐ Pending | Session must be invalidated on the server, not just cleared client-side |
| 2.7 | Password reset tokens expire within a reasonable time window | 🟠 High | ☐ Pending | If implemented; recommend 1-hour expiry |
| 2.8 | Email verification is enforced for email/password registrations | 🟡 Medium | ☐ Pending | If implemented by the auth provider |
| 2.9 | After a password change, all existing sessions for that user are invalidated | 🟠 High | ☐ Pending | Prevents session fixation after credential compromise |
| 2.10 | OAuth tokens are never stored in plaintext in the database | 🔴 Critical | ☐ Pending | Delegate token storage entirely to the auth provider |

---

## Section 3 — Authorization and Role Enforcement

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 3.1 | All admin routes require ADMIN or SUPER_ADMIN — checked optimistically in Proxy | 🔴 Critical | ☐ Pending | Navigation-level guard |
| 3.2 | All admin routes require ADMIN or SUPER_ADMIN — enforced in Server Actions | 🔴 Critical | ☐ Pending | Action-level guard — Proxy alone is not sufficient |
| 3.3 | Super Admin routes require SUPER_ADMIN — enforced in Proxy and again in actions | 🔴 Critical | ☐ Pending | User management, role changes, manual badge awards |
| 3.4 | Regular users cannot call verse create/update/delete/publish actions | 🔴 Critical | ☐ Pending | Role check in each verse action |
| 3.5 | Regular users cannot call pack management actions | 🔴 Critical | ☐ Pending | Role check in each pack action |
| 3.6 | Regular users cannot call waypoint management actions | 🔴 Critical | ☐ Pending | Role check in each waypoint action |
| 3.7 | Regular users cannot call badge create/update/toggle actions | 🔴 Critical | ☐ Pending | Role check in each badge admin action |
| 3.8 | Only SUPER_ADMIN can call `awardBadgeManuallyAction` | 🔴 Critical | ☐ Pending | Manual badge awards must be logged in AuditLog |
| 3.9 | Only SUPER_ADMIN can change user roles | 🔴 Critical | ☐ Pending | Prevents privilege escalation by regular admins |
| 3.10 | Regular admins cannot call `overrideCooldownAction` for other admins | 🟠 High | ☐ Pending | Cooldown override must be role-gated and audit-logged |
| 3.11 | Users cannot update another user's profile, settings, or progress | 🟠 High | ☐ Pending | Always derive userId from `session.user.id` — never trust client-provided userId |
| 3.12 | Fellowship admin actions check that the requestor is the fellowship LEADER | 🟠 High | ☐ Pending | Kicking members, editing details, dissolving group |

---

## Section 4 — Input Validation

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 4.1 | Every Server Action that accepts input validates it with Zod before any other logic | 🔴 Critical | ☐ Pending | Zod validation must be step 1, before auth checks even |
| 4.2 | Verse reference fields are validated for format | 🟡 Medium | ☐ Pending | Prevent malformed content |
| 4.3 | Translation codes are enum-validated (NIV/ESV/KJV only for MVP) | 🟡 Medium | ☐ Pending | Prevent invalid translation codes |
| 4.4 | Journey Stage values are enum-validated (LEARN/RECALL/STRENGTHEN/MASTER) | 🟠 High | ☐ Pending | Invalid stage values would break gameplay rules |
| 4.5 | Game mode values are enum-validated using the GameMode enum | 🟠 High | ☐ Pending | `CUE` is a valid value; `HINT` is not |
| 4.6 | Waypoint numbers are range-validated (1–220 for current curriculum) | 🟠 High | ☐ Pending | Prevent out-of-range waypoint manipulation |
| 4.7 | Fellowship names and descriptions are length-limited | 🟡 Medium | ☐ Pending | Prevent storage abuse and UI breakage |
| 4.8 | User display names are length-limited and sanitized | 🟡 Medium | ☐ Pending | Prevent UI abuse and XSS |
| 4.9 | Private notes (Sanctuary) are length-limited | 🟡 Medium | ☐ Pending | Prevent storage abuse |
| 4.10 | Shop item IDs in purchase requests are validated server-side | 🟠 High | ☐ Pending | Prevent purchasing non-existent or inactive items |
| 4.11 | Game completion payloads are validated — server independently computes which mode/day should be complete | 🔴 Critical | ☐ Pending | Client never dictates what is being completed |
| 4.12 | Badge requirement fields are validated when creating/updating badges | 🟡 Medium | ☐ Pending | Malformed requirements would break badge engine |

---

## Section 5 — Progression Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 5.1 | Waypoint unlock status is always computed server-side | 🔴 Critical | ✅ Implemented | Lazy initialization and next-waypoint selection run in the progression repository |
| 5.2 | Day unlock status is always computed server-side from stored timestamps | 🔴 Critical | ✅ Implemented | `isDayPlayable` is reapplied inside the guarded start transaction |
| 5.3 | Day 2 unlock requires Day 1 to be marked complete in the database | 🔴 Critical | ✅ Implemented | Progression transaction verifies the preceding persisted day |
| 5.4 | Day 3 unlock requires Day 2 to be marked complete in the database | 🔴 Critical | ✅ Implemented | Progression transaction verifies the preceding persisted day |
| 5.5 | 24-hour cooldown is calculated from the stored `completedAt` timestamp — never from client time | 🔴 Critical | ✅ Implemented | Server-derived completion time plus exact elapsed UTC hours; client countdowns remain display-only |
| 5.6 | `overrideCooldownAction` requires ADMIN or SUPER_ADMIN role | 🟠 High | ☐ Pending | Must be for testing only and audit-logged |
| 5.7 | Completing Day 3 unlocks only the next currently published waypoint selected by the server | 🟠 High | ✅ Implemented | Database ordering is used rather than a client ID or an `N+1` assumption |
| 5.8 | Duplicate day completion is prevented by the unique `(userId, waypointId, dayLevel)` record, transaction lock, and completed-state check | 🔴 Critical | ✅ Implemented | Database and transactional defenses reject repeat or concurrent completion |
| 5.9 | Game mode completion order is enforced server-side (DRAG_DROP → PUZZLE → SWAP → CUE → FILL) | 🟠 High | ☐ Pending | User cannot jump to Fill mode without completing previous modes |
| 5.10 | A day cannot be marked complete unless all five modes are recorded as complete | 🔴 Critical | ☐ Pending | Prevents partial-day reward collection |
| 5.11 | Journey Stage hint rules are enforced server-side in `useHintAction` | 🔴 Critical | ☐ Pending | STRENGTHEN and MASTER stage requests must be rejected at the action level |
| 5.12 | Journey Stage time limit rules are enforced server-side | 🟠 High | ✅ Complete | Per-mode limits are Recall 5m, Strengthen 3m, Master 2m; persisted attempt time is authoritative and client timers are display-only |

---

## Section 6 — Glow Points and Rewards Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 6.1 | Glow Points are awarded server-side only — client never sends a point amount | 🔴 Critical | ☐ Pending | Point values are read from server constants, never from request body |
| 6.2 | Day 1/2/3 multipliers are calculated server-side using constants | 🟠 High | ☐ Pending | Client cannot manipulate the multiplier |
| 6.3 | Every point award inserts a `RewardLedger` record in the same transaction | 🟠 High | ☐ Pending | Provides immutable audit trail |
| 6.4 | Duplicate reward claims are prevented by unique DB constraint + transaction | 🔴 Critical | ☐ Pending | The `(userId, waypointId, dayLevel)` constraint is the final guard |
| 6.5 | Badge Glow Point rewards are awarded server-side via the badge engine | 🟠 High | ☐ Pending | Same rules as day completion rewards |
| 6.6 | No XP system exists — Glow Points is the only currency | 🟢 Low | ☐ Pending | Code and comments must not reference XP or experience points |
| 6.7 | Oil Shop purchases use a database transaction — balance + inventory + ledger updated atomically | 🔴 Critical | ☐ Pending | Partial purchase state must be impossible |
| 6.8 | Oil Shop purchase prevents negative Glow Points balance | 🔴 Critical | ☐ Pending | Check balance before deducting; reject if insufficient |
| 6.9 | Users cannot purchase inactive or non-existent shop items | 🟡 Medium | ☐ Pending | Server validates item existence and active status |

---

## Section 7 — Badge System Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 7.1 | Badge progress is always calculated server-side by the badge engine | 🔴 Critical | ☐ Pending | Client cannot send badge unlock requests |
| 7.2 | Badge unlock fires exactly once per badge per user — prevented by unique constraint | 🔴 Critical | ☐ Pending | `(userId, badgeId)` must have a unique constraint with `unlocked: true` |
| 7.3 | Glow Points from badge unlock are awarded through the same reward transaction | 🟠 High | ☐ Pending | Same ledger rules as day completion |
| 7.4 | Manual badge award (`awardBadgeManuallyAction`) requires SUPER_ADMIN role | 🔴 Critical | ☐ Pending | Role check enforced at action level |
| 7.5 | Every manual badge award is recorded in `AuditLog` | 🟠 High | ☐ Pending | Accountability for administrative privilege use |
| 7.6 | Disabled badges cannot be unlocked by players | 🟡 Medium | ☐ Pending | Badge engine checks `isActive` before evaluating |
| 7.7 | Hidden badges are not revealed in API responses until unlocked | 🟡 Medium | ☐ Pending | Badge name and description omitted for hidden+locked badges |

---

## Section 8 — Gameplay Integrity

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 8.1 | Answer validation normalizes both user input and stored `normalizedText` before comparing | 🟡 Medium | ☐ Pending | Prevents case/punctuation unfairness |
| 8.2 | `normalizedText` is generated server-side when a translation is saved — never client-generated | 🟠 High | ☐ Pending | Client cannot manipulate the normalized comparison target |
| 8.3 | Swap mode tracks token positions, not word text values | 🟡 Medium | ☐ Pending | Duplicate words in a verse must be handled correctly |
| 8.4 | Phrase generator is deterministic for a given input set | 🟢 Low | ☐ Pending | Prevents confusing phrase changes on retry |
| 8.5 | Each `GameSession` belongs to the authenticated user — server validates ownership | 🔴 Critical | ☐ Pending | User A cannot write to User B's game session |
| 8.6 | Completed game mode sessions cannot be submitted again for additional rewards | 🔴 Critical | ☐ Pending | `completeGameModeAction` checks existing records before inserting |
| 8.7 | Hint usage is validated against the current Journey Stage server-side | 🔴 Critical | ☐ Pending | STRENGTHEN and MASTER stage hint requests are rejected regardless of client state |
| 8.8 | Hint balance is enforced server-side — free allowance + purchased hints only | 🟡 Medium | ☐ Pending | Client cannot inflate the hint count |
| 8.9 | Hint usage is recorded in `HintUsage` with session reference | 🟡 Medium | ☐ Pending | Auditability |
| 8.10 | `CUE` mode is distinct from the Hint System — Cue Mode inputs are never blocked by hint count | 🟡 Medium | ☐ Pending | Cue Mode is a game mode; Hint System is a separate assistance feature |

---

## Section 9 — Data Privacy

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 9.1 | Leaderboard queries never return user email addresses | 🔴 Critical | ☐ Pending | Only display name, country, and stats |
| 9.2 | Fellowship member lists never expose user emails | 🔴 Critical | ☐ Pending | Display name only |
| 9.3 | Public profile data is limited to display name, country, and game stats | 🟠 High | ☐ Pending | No email, no internal IDs in public responses |
| 9.4 | Private Sanctuary notes are visible only to the note's owner | 🔴 Critical | ☐ Pending | Ownership check: `note.userId === session.user.id` |
| 9.5 | Admin user management list is accessible only to SUPER_ADMIN | 🔴 Critical | ☐ Pending | Regular admins cannot see the full user list with emails |
| 9.6 | Audit logs are readable only by SUPER_ADMIN | 🟠 High | ☐ Pending | Audit logs contain sensitive operational history |
| 9.7 | Production error messages do not reveal stack traces, schema details, or Prisma errors | 🟠 High | ☐ Pending | Catch and sanitize all errors before returning to client |
| 9.8 | Server logs never contain passwords, session tokens, or secret values | 🔴 Critical | ☐ Pending | Review all `logger.ts` calls |
| 9.9 | Hidden badge names and descriptions are omitted from API responses for locked+hidden badges | 🟡 Medium | ☐ Pending | Only reveal badge identity on unlock |

---

## Section 10 — User-Generated Content

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 10.1 | Fellowship names are sanitized and escaped before rendering in the UI | 🟡 Medium | ☐ Pending | Prevent XSS |
| 10.2 | Fellowship descriptions are sanitized and escaped before rendering | 🟡 Medium | ☐ Pending | Prevent XSS |
| 10.3 | User display names are sanitized and escaped before rendering | 🟡 Medium | ☐ Pending | Prevent XSS |
| 10.4 | Sanctuary private notes are sanitized and escaped before rendering | 🟡 Medium | ☐ Pending | Prevent XSS |
| 10.5 | Markdown or HTML rendering is never applied to user-generated content unless sanitized | 🟠 High | ☐ Pending | If markdown rendering is added, use a sanitization library like DOMPurify |
| 10.6 | Length limits are enforced server-side (Zod) for all user-generated fields | 🟡 Medium | ☐ Pending | Prevent storage abuse and UI overflow |
| 10.7 | React JSX renders all user content as text nodes — `dangerouslySetInnerHTML` is never used | 🟠 High | ☐ Pending | React escapes text by default; `dangerouslySetInnerHTML` bypasses this |

---

## Section 11 — Rate Limiting and Abuse Prevention

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 11.1 | Login attempts are rate-limited per IP (e.g., 10 per 15 minutes) | 🟠 High | ☐ Pending | Brute force prevention |
| 11.2 | Registration attempts are rate-limited per IP | 🟡 Medium | ☐ Pending | Spam account prevention |
| 11.3 | Password reset requests are rate-limited per email | 🟠 High | ☐ Pending | Prevent email flooding |
| 11.4 | Game completion submissions are protected against rapid repeated calls | 🟡 Medium | ☐ Pending | Unique constraint handles duplicates, but rate limiting adds defense in depth |
| 11.5 | Hint usage action is rate-limited or guarded against rapid fire requests | 🟢 Low | ☐ Pending | Unique constraint prevents duplicate deduction |
| 11.6 | Fellowship creation is rate-limited per user | 🟡 Medium | ☐ Pending | Prevent fellowship spam |
| 11.7 | Admin bulk actions are confirmation-gated in the UI | 🟡 Medium | ☐ Pending | Prevent accidental destructive actions |

---

## Section 12 — Database Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 12.1 | `DATABASE_URL` is stored only in environment variables — never committed to source control | 🔴 Critical | ☐ Pending | `.env` must be in `.gitignore` |
| 12.2 | Unique constraint exists on `UserDayProgress (userId, waypointId, dayLevel)` | 🔴 Critical | ☐ Pending | Core duplicate reward prevention |
| 12.3 | Unique constraint exists on `UserBadgeProgress (userId, badgeId)` | 🔴 Critical | ☐ Pending | Prevents duplicate badge awards |
| 12.4 | `RewardLedger` records are never deleted or updated — insert only | 🟠 High | ☐ Pending | Immutable audit trail |
| 12.5 | Foreign key relations are defined and enforced in the Prisma schema | 🟠 High | ☐ Pending | Data integrity |
| 12.6 | Cascading deletes are explicitly reviewed — no accidental data loss | 🟠 High | ☐ Pending | Deleting a verse must not silently delete user progress |
| 12.7 | Indexes exist on `(userId, waypointId)` for progress queries | 🟡 Medium | ☐ Pending | Performance |
| 12.8 | Indexes exist on `(totalGlowPoints DESC)` and `(currentStreak DESC)` for leaderboard queries | 🟡 Medium | ☐ Pending | Performance |
| 12.9 | Database transactions are used for all multi-write operations | 🔴 Critical | ☐ Pending | Day completion, reward award, shop purchase, waypoint unlock |
| 12.10 | The database user in `DATABASE_URL` has only the permissions needed (not superuser) | 🟠 High | ☐ Pending | Principle of least privilege |
| 12.11 | `prisma migrate dev` is never run against the production database | 🔴 Critical | ☐ Pending | Use `prisma migrate deploy` in production |

---

## Section 13 — Environment and Secrets Management

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 13.1 | `.env` is listed in `.gitignore` | 🔴 Critical | ☐ Pending | Never commit secrets |
| 13.2 | `.env.example` exists with placeholder values only — no real secrets | 🟡 Medium | ☐ Pending | Developer onboarding |
| 13.3 | Auth secret is cryptographically random and at least 32 characters | 🔴 Critical | ☐ Pending | Use `openssl rand -base64 32` to generate |
| 13.4 | Production and development/staging secrets are completely separate | 🟠 High | ☐ Pending | No shared secrets across environments |
| 13.5 | All `NEXT_PUBLIC_*` environment variables are reviewed — none contain secrets | 🔴 Critical | ☐ Pending | `NEXT_PUBLIC_*` variables are exposed in browser bundles |
| 13.6 | Secrets are rotated immediately if a `.env` file is ever accidentally committed | 🔴 Critical | ☐ Pending | Treat any committed secret as compromised |

---

## Section 14 — Frontend Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 14.1 | Client components never contain secrets or sensitive configuration | 🔴 Critical | ☐ Pending | All client code is visible in browser dev tools |
| 14.2 | Client state is never trusted for authorization decisions | 🔴 Critical | ☐ Pending | Server validates everything independently |
| 14.3 | Form submit buttons are disabled during submission to prevent double-submit | 🟡 Medium | ☐ Pending | UX and abuse reduction |
| 14.4 | Sonner toast messages never expose stack traces, raw Prisma errors, secrets, private data, or internal IDs | 🟡 Medium | ☐ Pending | Complex failures show a safe message and stable catalogue code only |
| 14.5 | Error boundaries render safe, generic messages — no internal stack traces | 🟡 Medium | ☐ Pending | `error.tsx` must not render raw error objects |
| 14.6 | `prefers-reduced-motion` preference is respected — animations disabled when set | 🟢 Low | ☐ Pending | Accessibility requirement |
| 14.7 | Security headers are configured in `next.config.ts` | 🟡 Medium | ☐ Pending | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP |
| 14.8 | Error-reference entries are safe for browser delivery and the reference route verifies ADMIN authorization server-side | 🟡 Medium | ☐ Pending | Codes describe conditions; detailed private diagnostics remain server-only |

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
| 15.1 | Admin dashboard is protected by ADMIN or SUPER_ADMIN role at Proxy level | 🔴 Critical | ☐ Pending | Optimistic navigation-level protection |
| 15.2 | Admin dashboard is protected by ADMIN or SUPER_ADMIN role at action and data-access level | 🔴 Critical | ☐ Pending | Secure authorization — Proxy alone is not enough |
| 15.3 | Verse create/update/publish actions check ADMIN+ role | 🔴 Critical | ☐ Pending | Per-action check |
| 15.4 | Pack create/update/publish actions check ADMIN+ role | 🔴 Critical | ☐ Pending | Per-action check |
| 15.5 | Waypoint create/assign/reorder actions check ADMIN+ role | 🔴 Critical | ☐ Pending | Per-action check |
| 15.6 | Badge create/update/toggle actions check ADMIN+ role | 🔴 Critical | ☐ Pending | Per-action check |
| 15.7 | User role changes require SUPER_ADMIN and are logged | 🔴 Critical | ☐ Pending | Highest privilege escalation risk |
| 15.8 | Cooldown override actions require ADMIN+ and are logged in AuditLog | 🟠 High | ☐ Pending | Every override logged with who, which user, which waypoint, when |
| 15.9 | Manual badge awards require SUPER_ADMIN and are logged in AuditLog | 🔴 Critical | ☐ Pending | Every manual award logged |
| 15.10 | Destructive admin actions (delete verse, archive waypoint) require confirmation dialog | 🟡 Medium | ☐ Pending | Prevent accidental data deletion |
| 15.11 | Admin audit log is readable only by SUPER_ADMIN | 🟠 High | ☐ Pending | Regular admins must not read the audit trail |

---

## Section 16 — Deployment Security

| # | Check | Risk | Status | Notes |
|---|---|---|---|---|
| 16.1 | Production build passes `tsc --noEmit` with zero errors | 🟠 High | ☐ Pending | Type safety in production |
| 16.2 | Lint passes with zero errors | 🟡 Medium | ☐ Pending | Code quality |
| 16.3 | No `console.log` debug statements remain — use `lib/logger.ts` | 🟡 Medium | ☐ Pending | Avoid data leaks in logs |
| 16.4 | No `any` types exist in the codebase | 🟠 High | ☐ Pending | TypeScript integrity |
| 16.5 | HTTPS is enforced by the hosting provider — no plain HTTP in production | 🔴 Critical | ☐ Pending | Transport security |
| 16.6 | Database connection uses SSL in production | 🟠 High | ☐ Pending | Transport encryption for DB connections |
| 16.7 | Database is not publicly accessible — only accessible from the application server | 🟠 High | ☐ Pending | Network-level protection |
| 16.8 | `NODE_ENV=production` is set in the deployment environment | 🟠 High | ☐ Pending | Disables Prisma query logging, enables production optimizations |
| 16.9 | Database backup strategy is in place | 🟡 Medium | ☐ Pending | Recovery planning |
| 16.10 | npm audit shows no critical or high vulnerabilities | 🟠 High | ☐ Pending | Run `npm audit` before every deployment |
| 16.11 | Dependency versions are pinned or regularly audited | 🟡 Medium | ☐ Pending | Consider Dependabot or equivalent |

---

## Section 17 — Manual Security Test Cases

Execute all of these test cases before approving any production deployment.

### Test 1 — Unauthenticated Route Access
1. Log out completely.
2. Visit `/app/map` directly in the browser.
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
