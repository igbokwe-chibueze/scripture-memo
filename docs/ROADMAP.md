# Scripture Memo — AI Build Roadmap
**Version:** 2.0  
**Purpose:** This roadmap gives the AI a step-by-step implementation plan. Complete each phase in order. Do not skip architectural setup. Do not start feature work until the foundation phases are correct and their acceptance criteria are met.

---

## Before You Start

Read these documents in this order before writing a single line of code:

1. `PRODUCT-OVERVIEW.md` — understand the full product, all systems, and all rules.
2. `AGENTS.md` — understand how to work in this codebase.
3. `SECURITY-AUDIT.md` — understand what security standards must be maintained throughout.

Confirm the following before proceeding:

- The app uses a root-based folder structure with no `src/` folder.
- All features live in `features/` organized by business domain.
- Server Actions are the default mutation pattern.
- Prisma is only ever called inside repository files.
- Sonner is the toast library.
- TypeScript is strict — no `any` anywhere.

---

## Phase 0 — Requirements Lock

**Goal:** Fully understand the product before touching the codebase.

### Tasks

1. Read `PRODUCT-OVERVIEW.md` completely.
2. Read `AGENTS.md` completely.
3. Read `SECURITY-AUDIT.md` completely.
4. Write a brief internal summary of the architecture, the progression systems, and the security constraints before writing any code.

### Acceptance Criteria

- No code written yet.
- AI can correctly describe the difference between the Three-Day Challenge System and the Journey Stage System.
- AI can correctly describe the five game mode names and their order.
- AI understands that hints are disabled for Strengthen and Master stages.
- AI understands that Glow Points are the only currency — no XP system.

---

## Phase 1 — Project Bootstrap

**Goal:** Create the Next.js project foundation with the correct structure.

### Tasks

1. Create a Next.js 16.2.10 project with TypeScript using App Router. The documentation bundled with the installed Next.js package is authoritative for framework APIs and conventions.
2. Configure Tailwind CSS.
3. Install and initialize shadcn/ui.
4. Install all required packages:
   ```
   prisma
   @prisma/client
   zod
   react-hook-form
   @hookform/resolvers
   sonner
   lucide-react
   date-fns
   clsx
   tailwind-merge
   next-themes
   @dnd-kit/core
   @dnd-kit/sortable
   @dnd-kit/utilities
   framer-motion
   ```
5. Create the root-based folder structure with placeholder `.gitkeep` files where needed:
   ```
   app/
   components/
   features/
   hooks/
   lib/
   prisma/
   public/
     audio/
   types/
   ```
6. Do not create a `src/` folder under any circumstances.
7. Configure the path alias `@/*` to the project root in `tsconfig.json`.
8. Enable TypeScript strict mode in `tsconfig.json`.
9. Create `app/layout.tsx` with the Sonner `<Toaster />` component included at the root level.
10. Create placeholder `app/loading.tsx`, `app/error.tsx`, and `app/not-found.tsx`.

### Acceptance Criteria

- App runs locally on `localhost:3000`.
- No `src/` folder exists.
- `@/features/...`, `@/lib/...`, `@/components/...` path aliases resolve correctly.
- `<Toaster />` is present in the root layout.
- TypeScript strict mode is enabled.

---

## Phase 2 — Global UI Foundation

**Goal:** Create all globally reusable UI building blocks before any feature work begins.

### Tasks

1. Install required shadcn/ui components:
   - button, input, textarea, card, tabs, badge, dialog, dropdown-menu, switch, skeleton, sheet, field, select, sonner, progress, scroll-area, separator, tooltip, popover, avatar

   `field` is the current shadcn form-composition primitive and replaces the legacy empty `form` registry entry. Compose it with React Hook Form's `Controller` and Zod validation as documented by the current shadcn form guidance.
2. Create shared components in `components/shared/`:
   ```
   app-shell.tsx         ← navigation wrapper for authenticated pages
   page-header.tsx       ← title + subtitle + optional action slot
   empty-state.tsx       ← icon + message + optional CTA
   loading-spinner.tsx   ← centered spinner, accepts size prop
   loading-button.tsx    ← button with isPending state
   confirmation-dialog.tsx ← yes/cancel modal
   countdown-timer.tsx   ← live countdown to a target Date, fires onExpire
   status-badge.tsx      ← pill badge with status and color
   stat-card.tsx         ← label + value + optional icon
   form-error.tsx        ← inline form error block
   form-success.tsx      ← inline form success block
   responsive-container.tsx ← max-width wrapper
   ```
3. Create `components/data-table/`:
   ```
   data-table.tsx
   data-table-pagination.tsx
   data-table-toolbar.tsx
   ```
4. Comment every shared component explaining its purpose and all accepted props.
5. Add a `loading.tsx` and `error.tsx` for the `(protected)` route group.
6. Configure `next-themes` for dark/light/system theme support.

### Acceptance Criteria

- All shared components render without errors.
- `<CountdownTimer>` counts down correctly and fires `onExpire`.
- `<LoadingButton>` visually shows pending state and prevents double-click.
- Sonner toasts can be triggered from a test button on any page.
- Theme switching works.

---

## Phase 3 — Database and Prisma Setup

**Goal:** Define and apply the complete database schema.

### Tasks

1. Initialize Prisma inside the root `prisma/` folder.
2. Create `lib/prisma.ts` with a singleton Prisma client:
   ```ts
   // WHY: Next.js hot reload instantiates new modules in development.
   // Without a global singleton, each reload creates a new PrismaClient,
   // which quickly exhausts the PostgreSQL connection pool.
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
   export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: [...] })
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
   ```
3. Define all enums in `schema.prisma`:
   - `UserRole` (USER, ADMIN, SUPER_ADMIN)
   - `TranslationCode` (NIV, ESV, KJV)
   - `WaypointStatus` (LOCKED, UNLOCKED, IN_PROGRESS, COOLDOWN, COMPLETED)
   - `JourneyStage` (LEARN, RECALL, STRENGTHEN, MASTER)
   - `DayLevel` (GLIMMER, GLOW, RADIANCE)
   - `GameMode` (DRAG_DROP, PUZZLE, SWAP, CUE, FILL)
   - `CompletionStatus` (NOT_STARTED, IN_PROGRESS, COMPLETED)
   - `BadgeCategory` (LEARNING, STREAK, MASTERY, INDEPENDENCE, SPEED, EXPLORATION)
   - `BadgeRarity` (COMMON, UNCOMMON, RARE, EPIC, LEGENDARY)
   - `RewardEventType` (DAY_COMPLETE, BADGE_UNLOCK, MANUAL_ADMIN_AWARD)
4. Define all models with full relations, unique constraints, indexes, and timestamps:
   - User, UserProfile, UserSettings
   - Verse, VerseTranslation, Tag, VerseTag
   - Pack, PackVerse
   - Waypoint (must include `journeyStage JourneyStage` field)
   - UserWaypointProgress, UserDayProgress
   - GameSession, GameModeAttempt
   - HintUsage
   - RewardLedger (immutable ledger with `userId`, `amount`, `eventType`, `reason`, `createdAt`)
   - UserStreak
   - Badge, UserBadgeProgress
   - Fellowship, FellowshipMember
   - ShopItem, UserShopPurchase
   - UserVerseNote, UserFavoriteVerse
   - AuditLog
   - Auth provider tables (sessions, accounts, verification tokens)
   - User account-suspension fields and a `GameSession` Vault-replay marker
5. Add a **unique constraint** on `(userId, waypointId, dayLevel)` in `UserDayProgress` to prevent duplicate day completion records at the database level.
6. Add indexes for: user progress queries `(userId, waypointId)`, leaderboard
   queries on `totalWaypointsCompleted DESC` and `totalGlowPoints DESC`, streak
   queries on `currentStreak DESC`, and the country/fellowship keys used to
   filter leaderboard scopes.
7. Run `prisma format`, then `prisma migrate dev --name init`.

### Acceptance Criteria

- `prisma generate` succeeds.
- All tables exist in the database.
- The `Waypoint` model has a `journeyStage` field.
- The `GameMode` enum includes `CUE` (not `HINT`).
- Unique constraint on `UserDayProgress (userId, waypointId, dayLevel)` is present.
- `RewardLedger` exists as an immutable event log.

---

## Phase 4 — Core Libraries

**Goal:** Create all app-wide utilities, typed patterns, and helper functions.

### Tasks

1. Create `types/api.ts` with the typed action response pattern:
   ```ts
   export type ActionResult<T = undefined> =
     | { success: true; message: string; data?: T }
     | { success: false; message: string; fieldErrors?: Record<string, string[]> }
   ```
2. Create `lib/utils.ts` with `cn()` utility and shared helpers.
3. Create `lib/dates.ts`:
   - `addHours(date, hours): Date`
   - `isAfterNow(date): boolean`
   - `getRemainingMs(targetDate): number`
   - `formatCountdown(ms): string` — returns "23h 14m" style string
   - Add comments explaining cooldown time arithmetic.
4. Create `lib/permissions.ts`:
   - `isAdmin(role): boolean`
   - `isSuperAdmin(role): boolean`
   - `requireAdmin(session): void` — throws if not admin
   - `requireSuperAdmin(session): void` — throws if not super admin
5. Create `lib/logger.ts` — safe server-side logging that never logs passwords, tokens, or secrets.
6. Create `lib/rate-limit.ts` — placeholder or implementation using Upstash or equivalent.
7. Create `lib/constants.ts`:
   - `GAME_MODE_ORDER: GameMode[]` — `[DRAG_DROP, PUZZLE, SWAP, CUE, FILL]`
   - `DEFAULT_HINT_ALLOWANCE: number`
   - `BASE_GLOW_POINTS: number`
   - `DAY_COOLDOWN_HOURS: number` = 24
   - `DIFFICULTY_RANGES` mapping for each day level
8. Comment every helper extensively, especially date/cooldown and permission utilities.

### Acceptance Criteria

- `ActionResult` type is importable and used in at least one placeholder action.
- `GAME_MODE_ORDER` constant contains `CUE`, not `HINT`.
- Date helpers are manually verified to calculate cooldown correctly.
- Permission helpers throw correctly for unauthorized roles.

---

## Phase 5 — Authentication

**Goal:** Implement user registration, login, logout, and route protection.

### Tasks

1. Configure Better Auth (or chosen auth provider).
2. Create `features/auth/` structure:
   ```
   actions/login.action.ts
   actions/register.action.ts
   actions/logout.action.ts
   components/login-form.tsx
   components/register-form.tsx
   components/auth-card.tsx
   schemas/login.schema.ts
   schemas/register.schema.ts
   repositories/auth.repository.ts
   views/login-view.tsx
   views/register-view.tsx
   ```
3. Build login and register forms using React Hook Form + Zod.
4. Implement `<LoadingButton>` for all form submit buttons.
5. Add Sonner toasts: login error, register success, logout success.
6. Create the Next.js 16 root-level `proxy.ts` for optimistic route checks and redirects:
   - All `/game`, `/map`, `/waypoints`, `/vault`, `/sanctuary`, `/oil-shop`, `/fellowships`, `/leaderboard`, `/settings` routes require authentication.
   - All `/admin/*` routes require `ADMIN` or `SUPER_ADMIN` role.
   - Redirect unauthenticated users to `/login`.
   - Redirect authenticated non-admin users away from `/admin` routes.
7. On first login after registration, redirect to translation selection screen.
8. Translation selection: one-time screen asking the user to select NIV, ESV, or KJV. Saves to `UserSettings`.

### Acceptance Criteria

- Users can register with email and password.
- Users can log in and log out.
- Protected routes redirect unauthenticated users to `/login`.
- Admin routes are inaccessible to `USER` role.
- Translation selection persists to the database.
- Forms show validation errors inline and show loading state during submission.

### Post-phase password recovery extension (2026-08-03)

- Better Auth now owns forgot-password requests, one-hour reset tokens, password
  replacement, and existing-session revocation.
- Local testing uses the guarded `LIGHT_DEV` delivery mode, which downloads a
  request-scoped text file containing the reset URL and cannot run in production.
- `PROD` is the stable future email-delivery seam. A transactional provider can
  be connected there without replacing Better Auth or changing the recovery UI.
- Manual browser acceptance remains required for the request, file download,
  reset-link callback, new password, and old-session invalidation flow.

---

## Phase 6 — User Profile and Settings

**Goal:** Allow users to view and update their profile and preferences.

### Tasks

1. Create `features/users/` and `features/settings/`.
2. Create repositories: `user.repository.ts`, `settings.repository.ts`.
3. Create `updateUserSettingsAction` with Zod validation.
4. Build Settings screen:
   - Display name
   - Country (dropdown)
   - Preferred Bible translation (NIV / ESV / KJV)
   - Audio effects toggle
   - Reduced motion toggle
   - Theme preference (light / dark / system)
5. Add Sonner toast: "Settings saved."
6. Add loading state on save button.

### Acceptance Criteria

- Preferred translation change affects verse display immediately on next page load.
- Audio toggle persists across sessions.
- All form fields have loading and success states.

---

## Phase 7 — Admin Verse Management

**Goal:** Allow admins to create and fully manage verses and their translations.

### Tasks

1. Create `features/verses/` with full folder structure.
2. Create `verse.repository.ts`:
   - `findMany(filters)` — paginated, filterable by book, tags, active status
   - `findById(id)` — includes all translations
   - `create(data)`
   - `update(id, data)`
   - `archive(id)`
   - `publish(id)`
   - `upsertTranslation(verseId, translation, text)` — also generates and stores `normalizedText`
3. Create all verse Server Actions (ADMIN+ role required on each).
4. Build verse forms with: a canonical 66-book selector, exact chapter/verse
   limits, a server-generated reference preview, reflection, studyNote, tags,
   active status, and inline NIV/ESV/KJV translation input group.
5. Build `VersesListView` using the shared data table component. Sortable by book; filterable by active status and tags.
6. Add Sonner toasts on create, update, publish, archive.
7. Add loading, empty, and error states.
8. Add CSV bulk import with a downloadable template, strict server validation,
   preview, duplicate skipping, transactional writes, and an audit log entry.
9. Make reference/book search update dynamically with a 300ms debounce and apply
   book, tag, status, and sort selections immediately while preserving URL state.
10. Use searchable comboboxes for long predefined lists such as Bible books and
    countries; retain simple selects for short option sets.
11. Record create, update, publish, archive, and bulk-import administrator actions
    in `AuditLog`; each mutation and audit entry must share a transaction.

### Acceptance Criteria

- Admin can create a verse with all three translations.
- `normalizedText` is generated server-side and stored for each translation.
- References are generated server-side from a valid canonical book, chapter, and
  verse range; impossible chapter and verse numbers are rejected.
- Non-admin users receive an error if they attempt to call these actions.
- All Prisma queries are in `verse.repository.ts` only.
- CSV imports never overwrite an existing reference and report duplicate or
  invalid rows before confirmation.
- Verse search updates while the administrator types without submitting the
  complete filter form.
- Manual verse mutations and bulk imports produce actor-linked audit records
  without copying translation, reflection, or study-note content into metadata.

---

## Phase 8 — Admin Pack Management

**Status:** Complete — automated verification and manual acceptance passed on
2026-07-13.

**Goal:** Allow admins to organize verses into themed learning packs.

### Tasks

1. Create `features/packs/` with full folder structure.
2. Create `pack.repository.ts`:
   - `findMany()`
   - `findById(id)` — includes ordered verses
   - `create(data)`
   - `update(id, data)`
   - `addVerse(packId, verseId, order)`
   - `removeVerse(packId, verseId)`
   - `reorderVerses(packId, orderedVerseIds)`
   - `publish(id)` / `hide(id)`
3. Create pack Server Actions (ADMIN+ required).
4. Build admin pack views: list, create form, edit form, verse reorder UI (drag to reorder).
5. Add Sonner toasts on all mutations.
6. Audit every pack mutation and keep membership/order/status writes atomic.
7. New packs start hidden. Publishing requires at least one published verse, and
   removing the final verse automatically hides the pack.

### Acceptance Criteria

- Admin can create packs and manage their verse lists.
- Verse ordering within a pack is persisted correctly.
- Pack publish/hide status is respected.
- Empty packs cannot be published and cannot remain published after their final
  verse is removed.
- Reordering works with pointer, touch, keyboard, and explicit move controls.

---

## Phase 9 — Admin Waypoint Management

**Status:** Complete — automated verification and manual ADMIN acceptance passed;
curriculum-history hardening implemented.

**Goal:** Create and safely manage an expanding sequential waypoint curriculum.

### Tasks

1. Create `features/waypoints/` with full folder structure.
2. Create `waypoint.repository.ts`:
   - `findAll()` — ordered by number
   - `findByNumber(number)`
   - `findById(id)`
   - `assignVerse(waypointId, verseId, journeyStage)` — updates both verse assignment and journey stage
   - `reorder(orderedIds)`
   - `publish(id)` / `hide(id)`
3. Create waypoint Server Actions (ADMIN+ required).
4. Build admin waypoint management view: table of 220 slots, each showing: number, assigned verse reference, Journey Stage badge, active status, and assign/edit button.
5. **The `journeyStage` field is required when assigning a verse to a waypoint.** The admin must specify whether this appearance is Learn, Recall, Strengthen, or Master.
6. Add seed placeholders for all 220 waypoints in `prisma/seed.ts`.
7. Seed placeholders as hidden and unassigned with provisional `LEARN` stage.
   Assignment must explicitly set the intended Journey Stage, and publishing
   requires an assigned, currently published verse.
8. Allow ADMIN users to append individual hidden, unassigned waypoints after the
   current final waypoint; 220 is the bootstrap count, not a maximum.
9. Display total, assigned, unassigned, published, and hidden waypoint counts.
10. Enforce a continuous published prefix followed by hidden drafts.
11. Enforce per-verse Journey Stage order and uniqueness for Learn, Recall, and
    Strengthen; Master may repeat.
12. Lock the position, assignment, Journey Stage, and publication state of a
    waypoint after learner history exists.
13. Show pending feedback for visibility changes and human-readable movement
    details before and after reordering.
14. Make published assignments editable only after an unstarted waypoint is
    hidden, and make every waypoint with learner history fully immutable.
15. Prevent a verse used by a published waypoint from being archived and freeze
    verse content after learner history exists.
16. Serialize curriculum topology and verse-dependency mutations with
    transaction-scoped PostgreSQL advisory locks.
17. Maintain a destructive database-backed invariant suite that requires an
    explicitly separate, empty test database.
18. Provide both one-step arrow controls and a validated **Move to position**
    control for long-distance reordering. Direct moves update the proposed order
    and retain the explicit save step.

### Acceptance Criteria

- Admin can assign a verse and a Journey Stage to any waypoint.
- Two different waypoints can have the same verse assigned with different Journey Stages.
- Waypoints 1–220 exist after seeding.
- Empty placeholders remain hidden and cannot be published.
- Admin can append a waypoint and it receives the next sequential number.
- Published waypoints cannot contain a hidden gap.
- Reordering cannot invert Journey Stages for the same verse or move a progressed
  published waypoint.
- The same verse cannot repeat Learn, Recall, or Strengthen, while Master may
  repeat.
- A published but unstarted waypoint must be hidden before reassignment.
- A waypoint with learner history cannot be reassigned, hidden, or reordered.
- A published waypoint's verse cannot be archived, and progressed verse content
  cannot be edited.
- Admin can move an editable waypoint directly to a valid destination without
  repeated arrow clicks, preview every shifted position, and save explicitly.

---

## Phase 9A — Operational Error Code Foundation

**Status:** Implemented — automated verification passed; manual ADMIN acceptance
pending.

**Goal:** Keep runtime feedback concise while giving administrators a safe,
searchable troubleshooting manual.

### Tasks

1. Extend failed `ActionResult` responses with an optional typed error code.
2. Create one structured, version-controlled error catalogue.
3. Add a shared Sonner helper that displays the short message and code.
4. Create an ADMIN-authorized, `noindex` `/admin/error-reference` page searchable
   by code, feature, message, cause, example, and solution.
5. Add initial stable codes for waypoint and verse operational conflicts.
6. Keep field-validation errors uncoded and keep sensitive diagnostic data out of
   browser-visible messages and reference entries.
7. Add fast catalogue tests for code uniqueness, formatting, and documentation
   completeness.
8. Treat the catalogue as application-wide. Add its permanent navigation entry
   to the admin front page when that page is implemented, not to an individual
   feature's administration screen.

### Acceptance Criteria

- A coded failure shows a concise Sonner message and its code.
- Searching the reference page by an exact code returns its complete safe guide.
- Anonymous and non-admin navigation cannot render the reference page.
- Duplicate or malformed catalogue codes fail automated tests.
- Existing uncoded validation messages continue to work normally.

---

## Phase 10 — Progression Engine

**Goal:** Implement the server-side logic that controls all user progression, cooldowns, and unlocks.

**Implementation status (2026-07-13):** Complete. Unit and catalogue tests,
strict TypeScript, lint, architecture checks, the production build, and the real
PostgreSQL integration suites pass against the dedicated, migrated
`scripture-memo-integration-tests` Prisma Postgres resource. Progression
initialization and next-waypoint unlocking share the curriculum transaction lock
with administrator mutations, preventing availability checks from racing a
hide, reassignment, publication, append, or reorder.

### Tasks

1. Create `features/progression/` with full folder structure.
2. Create `progression.repository.ts`:
   - `getUserWaypointProgress(userId, waypointId)`
   - `getUserDayProgress(userId, waypointId, dayLevel)`
   - `initializeFirstWaypoint(userId)` — lazily creates only the first available
     published waypoint progress record on first login after registration
   - `markDayComplete(userId, waypointId, dayLevel, completedAt)` — uses a transaction
   - `setNextDayUnlock(userId, waypointId, dayLevel, unlockedAt)` — sets the unlock timestamp for the following day
   - `markWaypointComplete(userId, waypointId)`
   - `unlockNextWaypoint(userId, currentWaypointNumber)` — queries the next
     currently published waypoint from the database rather than assuming `N+1`
3. Create `features/progression/lib/progression-utils.ts`:
   ```ts
   // Returns whether a day is currently playable for a given user.
   // WHY: This is always checked server-side because client countdown timers
   // are purely cosmetic and can be bypassed by any user who sends a
   // crafted request directly to the Server Action.
   function isDayPlayable(dayProgress: UserDayProgress): boolean

   function calculateDay2UnlockTime(day1CompletedAt: Date): Date
   function calculateDay3UnlockTime(day2CompletedAt: Date): Date
   function getWaypointStatusForUser(progress: UserWaypointProgress | null): WaypointStatus
   ```
4. Add comments throughout explaining server-side authority over cooldown decisions.
5. Unique constraint verification: confirm that attempting to insert a duplicate `(userId, waypointId, dayLevel)` record throws a database error (which the action catches and handles gracefully).
6. Recheck that the waypoint and its verse are still published when gameplay
   starts; never unlock a hidden waypoint or one backed by an archived verse.
7. Commit Day 3 completion, waypoint completion, and creation of the next
   waypoint progress record in one transaction. If no later published waypoint
   exists, treat the learner as caught up with the currently available
   curriculum rather than as an error.
8. Create progress records lazily as waypoints unlock. Do not pre-create a locked
   record for every current or future waypoint.

### Acceptance Criteria

- New users have the first currently published, playable waypoint (normally
  Waypoint 1) in UNLOCKED status on first login.
- Day 2 is not playable until 24 hours after Day 1 completion (server enforced).
- Day 3 is not playable until 24 hours after Day 2 completion (server enforced).
- Completing Day 3 automatically unlocks Waypoint N+1.
- A user who sends a repeat completion request receives an error, not duplicate rewards.

---

## Phase 11 — Game Map

**Goal:** Build the visual representation of the complete expanding waypoint curriculum.

**Status:** Complete — automated verification and project-owner manual browser
acceptance passed on 2026-07-22. The protected `/game/map`
route loads the published curriculum and sparse learner progress in one batched
repository request. Map A renders one owner-supplied 9:16 illustration per
five-waypoint group, opens at the player's current map, and progressively mounts
earlier history above and future maps below during continuous scrolling. Map B
retains one paginated ten-waypoint grid at a time. Both include honest three-day
progress, current-node emphasis, safe locked-node feedback, an empty state, and
a matching route skeleton. The clickable destination URL is established for
Phase 12, which owns the Day Selection screen itself.
For pre-launch comparison, the original responsive card-grid presentation is
also retained as Map B. A persistent Map A/Map B control and deterministic
`variant` query parameter switch presentation without duplicating data access or
gameplay navigation.

### Tasks

1. Create `features/map/`.
2. Create `map.repository.ts`:
   - `getUserMapData(userId)` — fetches all waypoint progress records for the user efficiently (batch query, not N+1)
3. Create `features/map/views/game-map-view.tsx`.
4. Map A groups waypoints into sets of 5, uses one PNG per group, opens at the
   player's current group, and continuously loads previous/future groups during
   upward/downward scrolling. Map B groups waypoints into sets of 10 and renders
   one paginated grid group at a time.
5. Use `<WaypointCard>` for each node. Map A displays the waypoint control and
   flame progress; Map B additionally previews Scripture reference and Journey
   Stage. Day Selection owns the authoritative full details.
   Map A also provides a full-height right-side Trail Navigator at every
   breakpoint. The navigator lists all published five-waypoint trails with
   sequential trail numbers, artwork thumbnails, waypoint ranges, progress, and
   state. It can jump to unlocked trails; locked trails remain visible and
   disabled. Distant jumps must preserve progressive rendering rather than
   mounting every intervening trail.
   Bottom-right icon controls open the navigator and return the learner to the
   current trail after they browse distant history.
6. Clicking a locked waypoint fires a Sonner info toast: "Complete Waypoint [N] to unlock this."
7. Clicking an unlocked or in-progress waypoint navigates to the Day Selection screen.
8. Add skeleton loaders while map data loads.
9. Highlight the user's current active (lowest in-progress or next unlocked) waypoint.

### Acceptance Criteria

- Map displays every current waypoint, using five-node illustrated groups in Map
  A and ten-node grid groups in Map B, and accommodates appended waypoints
  without a fixed maximum.
- Map A remains visually focused, while Map B restores the original Scripture
  and Journey Stage preview for comparative testing.
- Waypoint status accurately reflects actual database progress.
- Locked waypoints are unclickable and show a toast explaining how to unlock.
- Skeleton loads correctly before data arrives.

**Acceptance recorded (2026-07-22):** The project owner confirmed Map A and Map
B progression parity, responsive presentation, continuous loading, Trail
Navigator behavior, locked-trail handling, distant jumps, and return-to-current
navigation work as intended.

---

## Phase 12 — Day Selection Screen

**Goal:** Allow users to select and begin available challenge days for a waypoint.

**Status:** Complete — automated verification and project-owner manual browser
acceptance passed on 2026-07-23. The authenticated
dynamic route renders the preferred verse translation, Journey Stage rules, and
three persisted day states. Starts validate and atomically create or resume a
server-owned session. Until Phase 13 supplies the five-mode game shell, a
temporary protected session-ready screen verifies the end-to-end start flow.
The live countdown component and server cooldown enforcement are verified in
isolation; the complete natural completion-to-cooldown learner flow is deferred
to Phase 13 because that phase implements playable modes and day completion.

### Tasks

1. Create the Day Selection view inside `features/waypoints/views/day-selection-view.tsx`.
2. Display at the top: verse reference, current translation, Journey Stage badge.
3. If Journey Stage is Strengthen or Master: show a "No hints available at this stage" notice.
4. If Journey Stage is Recall, Strengthen, or Master: show the appropriate
   generous, shorter, or strict time-limit notice for this stage.
5. Render three `<DayCard>` components (Glimmer, Glow, Radiance). Each shows:
   - Day name and difficulty label
   - Status (locked / cooldown / ready / complete)
   - Glow Points reward preview
   - Flame icon if complete
   - Real-time countdown timer (`<CountdownTimer>`) when in cooldown
   - Start button when ready
6. "Start" button calls `startGameSessionAction`. Server validates the day is actually playable before creating a session.
7. Clicking a locked or cooldown day fires a Sonner info toast with the reason and remaining time.

### Acceptance Criteria

- Day status is computed from real database timestamps, not client state.
- Countdown timers update in real time.
- Server blocks invalid day starts even if the client sends a direct request.
- Journey Stage information is clearly communicated on this screen.

**Acceptance recorded (2026-07-23):** The project owner accepted the Day
Selection presentation, challenge states, stage messaging, reward previews, and
session-start flow. End-to-end cooldown testing will occur in Phase 13 when a
learner can complete Glimmer through real gameplay.

---

## Phase 13 — Gameplay Shared Engine

**Goal:** Build all shared gameplay infrastructure used by all five modes.

### Tasks

1. Create `features/gameplay/` with the full folder structure documented in `PRODUCT-OVERVIEW.md` §4.
2. Create `gameplay.repository.ts`:
   - `startSession(userId, waypointId, day)` — creates or retrieves active `GameSession`
   - create or resume the next ordered, server-timed mode attempt
   - validate and complete an attempt against trusted session verse data
   - `getSessionProgress(sessionId)` — returns which modes are complete
3. Create `features/gameplay/lib/`:
   - `verse-tokenizer.ts` — splits verse text into word tokens with index positions
   - `hidden-word-generator.ts` — selects which tokens to hide based on percentage; comments must explain the selection algorithm
   - `phrase-generator.ts` — splits verses into balanced 2–4-word phrase chunks deterministically
   - `swap-generator.ts` — selects and swaps word tokens by position, not text; handles duplicate words; comments must explain position-based tracking
   - `answer-validator.ts` — normalizes both the user input and the correct answer before comparing; comments must explain why normalization is necessary
4. Create the game shell (`features/gameplay/components/game-shell.tsx`):
   - Displays: verse reference, Journey Stage badge, mode progress bar (Mode X of 5), hint button (hidden on Strengthen/Master), audio toggle
   - Timed stages use server-authoritative per-mode attempt limits: Recall 5
     minutes, Strengthen 3 minutes, and Master 2 minutes. Expiry permits a retry
     of the same mode without erasing earlier mode completion.
5. Create `startGameSessionAction`, `startGameModeAction`, and
   `completeGameModeAction`:
   - `completeGameModeAction` validates the answer and attempt on the server,
     records its terminal state, and atomically advances the challenge day after
     all five modes complete.
   - Phase 13 advances day and waypoint state without rewards. Glow Point
     awards, hints, streak updates, and badge evaluation remain deferred to
     their dedicated later phases.
6. Create `useAudioFeedback()` hook: checks user settings before playing any audio file.

### Acceptance Criteria

- A game session can be started for a valid, playable waypoint day.
- `completeGameModeAction` correctly detects when all 5 modes are done and triggers day completion.
- Answer validator passes case-insensitive, punctuation-stripped tests.
- Phrase generator returns the same phrases for the same input on retry.
- Swap generator correctly handles verses with duplicate words.
- Server rejects an expired timed attempt regardless of client timer state, and
  a retry receives a fresh attempt without losing completed modes.

### Implementation Status

**Complete — 2026-07-23.** The shared shell, deterministic generators,
normalized answer validation, ordered attempt lifecycle, server-authoritative
stage timers, immediate same-mode retries, audio feedback hook, and atomic
final-mode/day transition are implemented. Rewards, hints, streaks, and badges
remain assigned to their dedicated later phases.

**Acceptance recorded — 2026-07-23.** The project owner verified that Glimmer
opens the shared gameplay shell after the Phase 13 migration and generated
Prisma client were applied. Phase 14 — Drag & Drop Mode is next.

---

## Phase 14 — Drag & Drop Mode

**Goal:** Implement the first game mode.

### Tasks

1. Install `@dnd-kit/core` and configure for both mouse and touch.
2. Create `drag-drop-mode.tsx` in `features/gameplay/components/modes/`.
3. Build `<WordBank>` — shuffled pool of draggable word tiles.
4. Build `<BlankSlot>` — droppable target slot within verse text.
5. Build `<DraggableWord>` — word tile with pick animation.
6. Implement tap-to-select and tap-to-place for mobile (select word → highlight → tap blank → place).
7. Clicking/tapping a placed word returns it to the bank.
8. "Check" button validates all placements using `answer-validator.ts`.
9. Apply green (correct) / red (incorrect) visual state per slot.
10. On all correct: fire `completeGameModeAction`, show confetti, show Sonner success toast.
11. On any incorrect: show Sonner error toast "X answers need correcting."
12. Add pending state on Check button to prevent double-submission.
13. Audio: pick sound on drag start, drop sound on placement, error sound on failed check.

### Acceptance Criteria

- Works on desktop (mouse drag) and mobile (tap-to-place).
- Correct completion advances to Puzzle mode.
- Duplicate submission of the same completion is not possible while pending.

### Implementation Status

**Complete and manually accepted — 2026-07-23.** Drag & Drop now uses
deterministic day-level hiding and a shuffled position-identified word bank.
Mouse dragging, touch dragging, keyboard dragging, and mobile tap-to-place share
the same state model. Placed words return to the bank on activation, Check gives
per-slot feedback, pending state blocks repeat submissions, and a correct answer
uses the Phase 13 server-authoritative completion action before confetti, audio,
and the transition to Puzzle. Pointer collision requires the dragged pointer to
be physically inside a blank, drag auto-scroll is disabled, and immediate
pickup/drop tones respect the persisted audio preference. Selecting a bank word
or beginning a drag highlights every available blank, removing a placed word
also plays feedback, and surrounding punctuation remains anchored in the verse
instead of appearing on draggable word tiles. Successful completion now plays a
strong victory chord and pauses on an animated, reduced-motion-aware completion
screen until the learner explicitly continues. Gameplay has an Exit control
back to Day Selection. Administrators can replay completed Drag & Drop modes in
a clearly labeled client-only Test Replay that performs no progression writes.
Failed checks now play an immediate negative cue. Successful checks randomly
choose from three non-repeating victory treatments: triumphant chord, bright
fanfare, or a synthesized crowd-cheer-style celebration. The named pool is
extensible so recorded or additional victory sounds can be introduced later.
The shared shell, Drag & Drop surface, word bank, blanks, controls, and
completion interstitial use theme-aware semantic colors and now honor the
learner's saved Light, Dark, or System preference.
The shared landing-page theme switcher now persists authenticated choices
through a validated Server Action. This prevents the protected `/game` layout
from restoring an older database theme after a browser-only switch.

---

## Phase 15 — Puzzle Mode

**Goal:** Implement phrase-ordering mode.

### Tasks

1. Create `puzzle-mode.tsx` in `features/gameplay/components/modes/`.
2. Use `phrase-generator.ts` to split the verse into phrase chunks.
3. Same drag/tap mechanic as Drag & Drop but operating on phrase tiles.
   Render visible phrases and phrase blanks inline as one flowing verse
   sentence; do not present phrase positions as separate numbered rows.
4. Phrase tiles are visually wider and distinct from word tiles.
5. Validate correct phrase order on Check.
6. Apply difficulty based on current day level (percentage of phrases hidden).
7. On all correct: confetti, success toast, complete mode action.

### Acceptance Criteria

- Puzzle mode works for all three difficulty levels.
- Phrase generation is deterministic (same phrases on retry).
- Duplicate phrase issues handled by position tracking.

### Implementation Status

**Complete and manually accepted — 2026-07-26; phrase balancing revised
2026-07-28.** Puzzle uses stable, balanced 2–4-word phrase boundaries and
applies the Glimmer, Glow, and Radiance hidden-percentage ranges at phrase level.
Phrase
occurrences retain their original indexes, so duplicate text remains safe during
shuffle, placement, feedback, reconstruction, and validation. Mouse, touch,
keyboard drag, and mobile select-and-tap workflows share one state model.
Pointer drops require physical overlap, drag auto-scroll is disabled, and phrase
pickup, placement, removal, failed Check, and successful completion reuse the
accepted audio feedback system. Correct answers pass through the authenticated,
server-authoritative ordered-attempt action before confetti, toast feedback, and
the animated Continue interstitial. Completed Puzzle modes are available to
administrators through the non-progressing Test Replay controls.

Four- and five-word verses produce two balanced chunks, while verses of six or
more words target at least three. Glimmer moves at least two chunks, Glow at
least three, and Radiance moves every available chunk; all minimums clamp to the
available phrase count. This prevents medium verses from collapsing into one or
two oversized movable pieces while avoiding one-word fragments whenever the
verse length permits.

---

## Phase 16 — Swap Mode

**Goal:** Implement word-swap correction mode.

### Tasks

1. Create `swap-mode.tsx` in `features/gameplay/components/modes/`.
2. Use `swap-generator.ts` to produce the swapped verse state.
3. Swappable words render with yellow highlight.
4. Click/tap a yellow word → it turns purple (selected).
5. Click/tap another word while one is selected → the two swap positions.
6. Click/tap the same word again while selected → deselect (returns to yellow).
7. Check button validates all positions using token position tracking (not word text matching).
8. Correct positions → green. Still incorrect positions → red.
9. On all correct: confetti, success toast, complete mode action.

### Acceptance Criteria

- Swap mode correctly handles verses containing duplicate words.
- Selection state machine works cleanly: none selected → one selected → swap.
- User cannot complete the mode unless all words are in correct positions.

### Implementation Status

**Complete and manually accepted — 2026-07-26.** Swap deterministically rotates
a day-level percentage of word occurrences while retaining fixed verse
positions and punctuation.
Swappable words begin yellow, turn purple while selected, exchange on the second
selection, and deselect when activated twice. Check marks restored positions
green and remaining misplaced positions red. Occurrence indexes—not display
text—govern swaps and correctness, so duplicate words cannot produce false
completion. Incorrect checks play negative feedback; correct submissions use
the authenticated server-owned attempt action before randomized victory audio,
confetti, the success toast, and explicit completion interstitial. Completed
Swap modes are available through non-progressing administrator Test Replay.
The selected state uses an enforced high-contrast violet treatment across
custom themes. Refreshed Server Component data no longer changes the visible
mode immediately after completion: the shared shell retains the completed
surface and pauses its attempt timer until the player explicitly presses
Continue.

---

## Phase 17 — Cue Mode

**Goal:** Implement the first-letter cue recall mode (previously named Hint Mode).

### Tasks

1. Create `cue-mode.tsx` in `features/gameplay/components/modes/`.
2. Render the first letter as a light-grey placeholder cue (e.g., "L___").
3. Require the user to type the complete word, including the cued first letter.
4. Auto-advance when correct word length is reached.
5. Validate using `answer-validator.ts` (normalized comparison).
6. Apply green/red styling per input on Check.
7. On all correct: confetti, success toast, complete mode action.
8. Note: This mode is completely independent of the Hint System. A user's hint count has no effect on Cue Mode.

### Acceptance Criteria

- First-letter prefixes render correctly for all missing words.
- Validation is case-insensitive and punctuation-tolerant.
- Mode is named "Cue" throughout the UI, not "Hint."

### Implementation Status

**Complete and manually accepted — 2026-07-26.** Cue deterministically selects
eligible words within each day-level difficulty range and keeps canonical
punctuation outside the editable field. Each blank presents the translation's
first letter as a light-grey placeholder, while the learner must type the
complete word, including that letter. Input is sanitized and clamped to the
exact normalized target length for typing and paste, so extra characters cannot
enter the field. Inputs disable autocomplete, autocorrect, capitalization, and
spellcheck assistance, then advance focus when the exact target length is
reached. Check uses the shared case-insensitive, punctuation-tolerant normalizer
and applies green/red per-position feedback.
Correct answers pass through the authenticated ordered-attempt action before
victory audio, confetti, success toast, and the explicit Continue interstitial.
Completed Cue modes are available through non-progressing administrator Test
Replay and remain fully independent of the separate Hint System.
The shared completion dialog uses safe vertical centering: it remains centered
when it fits, but starts within the scrollable viewport on short mobile screens
so neither the success icon nor actions can be clipped above the scroll origin.

---

## Phase 18 — Fill Mode

**Goal:** Implement full missing-word typing mode (the final mode of each day).

### Tasks

1. Create `fill-mode.tsx` in `features/gameplay/components/modes/`.
2. Blanks render as plain input fields with no visual cue.
3. Focused inputs highlight blue.
4. Auto-advance when typed word reaches target length.
5. Check button validates all inputs using `answer-validator.ts`.
6. Green/red visual state per input.
7. On all correct: fire `completeGameModeAction`. Since Fill is Mode 5 (the
   last), the existing server-owned completion transaction verifies all prior
   modes and completes the day.
8. The existing day transition:
   - Sets the next day's `unlockedAt` timestamp.
   - If Day 3: marks the waypoint complete and unlocks the next currently
     published waypoint atomically.
   - Returns only persisted progression outcomes for accurate success feedback.
   - Leaves Glow Point awards to Phase 19, badge evaluation to Phase 24, and
     streak updates to Phase 25.
   - Never displays point, badge, or streak claims before those systems exist.

### Acceptance Criteria

- Completing Fill mode correctly triggers all downstream progression logic.
- The next day's unlock time is correctly set.
- Waypoint completion and next waypoint unlock happen atomically in a transaction.
- Later reward, badge, and streak phases remain unimplemented and are not
  represented as completed UI outcomes.

### Implementation Status

**Complete and manually accepted — 2026-07-26.** Fill deterministically hides complete words within each
day-level difficulty range and renders unassisted inputs with blue focus
feedback. Typing, paste, and autofill are sanitized and clamped to the exact
normalized word length; reaching that length advances to the next blank. Check
applies green/red per-position feedback and reconstructs canonical punctuation
outside the fields. A correct answer uses the authenticated fifth-mode
completion action, which proves the ordered session and atomically completes the
day, schedules the next-day cooldown, or completes Day 3 and unlocks the next
published waypoint. The completion screen waits for Continue, then returns to
Day Selection. After Radiance, Continue first opens a dedicated Waypoint
Complete milestone with three flames, the completed verse, the persisted
next-waypoint or caught-up outcome, and a distinct fanfare; its explicit action
returns to the trail map. Administrator Test Replay performs no writes. Per the approved
roadmap resolution, no Glow Point, streak, or badge outcome is claimed before
its dedicated phase.

Completed challenge-day cards now expose an administrator-only Test Replay
entry into the persisted completed session. The existing mode selector permits
replaying any completed mode without attempts, progression, rewards, or
cooldown changes. Active Glow and Radiance cooldown cards also expose an
administrator-only **Unlock for testing** action. It can affect only the
authenticated administrator's own progression, repeats ordering and timing
checks server-side, and commits an AuditLog record with the override.

---

## Phase 19 — Glow Points and Rewards

**Goal:** Implement the complete Glow Points reward system with a tamper-proof ledger.

### Tasks

1. Create `features/rewards/`.
2. Create `reward.repository.ts`:
   - `awardPoints(userId, amount, eventType, reason)` — inserts a `RewardLedger` record and updates the user's running total in one transaction
   - `getUserBalance(userId)` — returns total Glow Points
   - `getRewardHistory(userId, pagination)` — returns ledger entries
3. Point amounts read from `lib/constants.ts`:
   - Day 1: `BASE_GLOW_POINTS`
   - Day 2: `BASE_GLOW_POINTS * 1.5`
   - Day 3: `BASE_GLOW_POINTS * 2`
4. Add comments explaining:
   - Why points are calculated server-side only.
   - Why a ledger record is always created alongside the balance update.
   - How the unique constraint prevents duplicate rewards.

### Acceptance Criteria

- Completing Day 1 awards base points exactly once.
- Attempting to award points for the same day a second time returns an error, not double points.
- `RewardLedger` contains a record for every point event.
- User balance matches the sum of all ledger records.

### Implementation Status

**Complete and manually accepted — 2026-07-26.** The
server-verified fifth-mode transaction now creates an immutable
`DAY_COMPLETE` ledger entry and atomically increments the learner profile by
100 Glow Points for Glimmer, 150 for Glow, or 200 for Radiance. A unique key
derived from the authenticated learner, waypoint, and day prevents duplicate
awards. The persisted amount and new balance are returned for the completion
toast and interstitial; clients never submit a reward value. Balance and
bounded newest-first history reads are available through the rewards
repository. Unit tests, ESLint, and strict TypeScript pass. The dedicated
PostgreSQL integration test was added but the configured test database rejected
fixture creation before the reward transaction ran, matching the existing
test-database availability issue. Manual Glow completion awarded the expected
150 Glow Points, displayed the persisted new balance, and retained the explicit
Continue transition.

---

## Phase 20 — Hint System

**Goal:** Implement the standalone hint system that reveals full verse text during gameplay.

### Tasks

1. Create `features/hints/`.
2. Create `hint.repository.ts`:
   - `getHintBalance(userId)` — checks free hints + purchased hints
   - `useHint(userId, sessionId)` — decrements balance, records `HintUsage`
3. Create `useHintAction`:
   - Check Journey Stage — if STRENGTHEN or MASTER, return error immediately.
   - Check hint balance — if zero, return error.
   - Decrement balance and record usage in a transaction.
   - Return the full verse text for the current translation.
4. Build `<HintButton>` component inside gameplay shell:
   - Not rendered at all during Strengthen and Master Journey Stages.
   - Shows remaining hint count.
   - On click: calls `useHintAction`, opens modal with full verse text.
   - Sonner toast: "Hint used. X hints remaining."
5. Add `<HintModal>` showing full verse in preferred translation.

### Acceptance Criteria

- Hints cannot be used during Strengthen or Master stage waypoints.
- Hint count decrements correctly and persists.
- Using hints when the count is zero returns a helpful error toast.
- Hint modal shows the correct translation.

### Implementation Status

**Complete and manually accepted — 2026-07-28.** Learn and Recall gameplay
sessions show a touch-friendly Hint button with the persisted free balance;
Strengthen and Master render no control. The validated action
derives learner identity from the session, while the repository locks hint
consumption and rechecks session ownership, active campaign state, Journey
Stage, current mode, canonical session translation, and remaining balance
inside one transaction. Successful use creates `HintUsage`, increments
`totalHintsUsed`, opens the full-verse modal, and reports the remaining count.
The modal displays a six-second top progress bar and closes automatically;
reduced-motion users receive a static state and duration notice. Normal admin
campaign play consumes real hints, while Admin Test Replay provides unlimited
non-persisting **Test hint** access. Phase 20 grants the configured five
free hints; purchased hint entitlements remain explicitly deferred to Phase 22,
where shop products will gain an unambiguous hint quantity.

**Acceptance note:** The project owner manually verified the available hint
flow, persisted consumption, modal content, timed self-closing behavior, and
administrator test access. A full Strengthen/Master gameplay run is deferred to
the final end-to-end regression pass because reaching those stages requires
substantial progression; their prohibition remains independently enforced by
both the rendered shell and the server-owned action/repository checks.

---

## Phase 21 — Streak System

**Goal:** Track and display consecutive days of gameplay activity.

### Tasks

1. Create `streak-utils.ts` in `features/progression/lib/`:
   - `updateStreak(userId, activityDate)` — increments streak if consecutive day, resets if gap detected
   - `getStreakDisplay(streak: UserStreak): string` — returns "🔥 14-day streak"
2. Call `updateStreak` after each server-verified game-mode completion. The
   first mode completed on a learner-local calendar day updates the streak;
   later modes on that same day are idempotent.
3. Display streak in the game home screen header and on the user profile/vault.
4. Store both `currentStreak` and `longestStreak` in `UserStreak`.
5. Comment timezone handling: use user's stored timezone when determining calendar day boundaries; fall back to UTC.

### Acceptance Criteria

- Streak increments correctly on consecutive daily completions.
- Streak resets to 1 (not 0) on the day of activity after a missed day.
- Longest streak is retained even after a reset.

### Implementation Status

**Complete and manually accepted — 2026-07-28.** The first server-verified
game-mode completion on each learner-local calendar day updates the streak
inside the existing gameplay transaction. A per-user PostgreSQL
advisory lock makes concurrent completions safe, later modes on the same day are
idempotent, missed days reset the current value to one, and the best value never
regresses. User settings now persist a validated IANA timezone with a UTC
fallback. Current streak appears on Game Home, while current and best values
remain visible on Profile & Settings; the fuller Vault surface remains owned by
its dedicated roadmap phase. The protected shell automatically detects and
persists the browser's IANA timezone once, while Settings provides a validated
manual override without allowing a later device to replace that choice.
The transaction-owned streak outcome drives a separate celebration after the
standard mode-completion dialog only for started, increased, or reset streaks.
The milestone includes native sharing with a clipboard fallback. Standard mode
success and streak celebration are independently repeatable in
`/ui-foundation`; unchanged same-day completions and Admin Test Replay skip the
streak milestone.
Named streak levels range from Spark through Eternal Light. Crossing a level
threshold adds a stronger flame surge, expanding ember rings, and medallion
entrance. The screen also renders a server-derived forward seven-day level
forecast, exact days remaining, and projected learner-local milestone date.
It plays a synthesized burning-flame ambience while visible when audio is
enabled. After a reset, it replaces new-best treatment with the preserved
previous best. Any one-time Glow Point milestone rewards remain deferred to
Phase 22's idempotent badge-award transaction.

**Acceptance note:** The project owner verified automatic timezone detection,
manual timezone changes, first-day streak creation, same-day idempotency, and
the learner-facing displays. Observing a natural next-calendar-day increment is
deferred to the final regression pass because it requires waiting; deterministic
tests already cover consecutive local days, timezone boundaries, missed-day
reset, and best-streak retention.
The project owner also manually accepted the separate Daily, New Level, and
Reset celebration states, forward next-level forecast, always-visible target
marker, success-to-flame audio sequence, and native-share/clipboard behavior.

---

## Phase 22 — Badge System

**Goal:** Implement the complete badge achievement system.

**Implementation status (2026-07-28):** Complete and manually accepted. The
bootstrap catalogue contains all 27 currently documented badges. Criteria owned
by later roadmap features (Vault, Fellowships, and Leaderboards) are seeded but
remain dormant until those trusted events exist. The SUPER_ADMIN manual-award
flow remains a recorded deferred check until a second test account is available.

**Approved rarity rewards:** Common 50, Uncommon 100, Rare 200, Epic 350, and
Legendary 500 Glow Points.

Administrators can create and edit badge definitions only against the controlled
criterion catalogue. Criteria backed by the current server engine may be
activated immediately. Criteria owned by later features are clearly labeled,
may be saved for planning, and are forced to remain paused until their trusted
events exist. Pausing stops future progress and unlocks but never removes an
already-earned badge or reverses its reward.

An administrator may permanently delete a badge only while its completed unlock
count is zero. Deletion removes any partial progress in the same transaction and
writes an audit record. Once any player unlocks a badge, deletion is permanently
blocked and pausing is the only available retirement control.

### Tasks

1. Create `features/badges/` with full structure.
2. Create `badge.repository.ts`:
   - `findAll()` — all active badges
   - `findById(id)`
   - `getUserBadgeProgress(userId)` — all progress records for a user
   - `upsertProgress(userId, badgeId, progressCurrent)` — update progress, unlock if target met
   - `awardBadge(userId, badgeId)` — for Super Admin manual award
3. Create `features/badges/lib/badge-engine.ts`:
   ```ts
   // The badge engine evaluates whether any badge criteria are met after a
   // relevant event. It is called from Server Actions after progression events
   // complete. It never awards badges directly — it calls badge.repository
   // to update progress and checks if the new progress meets the unlock target.
   export async function evaluateBadgeProgress(
     userId: string,
     event: BadgeEvent
   ): Promise<void>
   ```
4. Define `BadgeEvent` type covering all triggerable events (day complete, streak update, hint-free completion, etc.).
5. Create `award-badge.action.ts` (SUPER_ADMIN only) with full audit logging.
6. Integrate badge engine calls into:
   - `completeDayAction` — learning, mastery, independence, speed events
   - `updateStreak` — streak events
   - `joinFellowshipAction` — exploration events
   - `createFellowshipAction` — exploration events
7. Build `features/badges/views/badge-collection-view.tsx`:
   - All badges displayed as cards.
   - Filter by category, rarity, completed, in-progress, locked.
   - Hidden badges show as "❓ Secret Badge."
   - Unlocked badges show unlock date and Glow Points earned.
8. Build badge unlock celebration: confetti + modal + audio.
9. Build admin badge management screens.

### Acceptance Criteria

- Badge progress updates automatically after relevant events.
- Badge unlock fires celebration modal, confetti, and audio.
- Hidden badges are not revealed until unlocked.
- Super Admin manual award is logged in the audit trail.
- `HINT` references do not appear in badge descriptions — mode is named `CUE`.

---

## Phase 23 — Vault

**Goal:** Build the user's complete progress archive and library.

### Tasks

1. Create `features/vault/`.
2. Create `vault.repository.ts`:
   - `getUserVaultSummary(userId)` — progress stats, streak info, Glow Points total
   - `getMasteredVerses(userId)` — verses where all four Journey Stages are complete
   - `getFavoriteVerses(userId)`
   - `getInProgressWaypoints(userId)`
3. Build `vault-view.tsx`:
   - Summary stats header (waypoints complete, Glow Points, current streak, best streak)
   - Mastered verses section
   - In-progress waypoints section
   - Favorite verses section
   - Link to Badge Collection (`/vault/badges`)
   - Filters: by translation, by pack
   - Completed verses section showing the Journey Stages completed for each verse
4. Add empty states for each section.
5. Allow replaying a mastered verse from the Vault (creates a new session without affecting progression).

### Acceptance Criteria

- Mastered verses section only shows verses where all four Journey Stages are complete.
- Vault replay does not re-award Glow Points or affect main progression.
- Replaying a verse from the Vault triggers Vault Explorer badge evaluation.

### Implementation Status

**Complete and accepted — 2026-08-01.** The private Vault includes summary
statistics, mastered verses, active waypoints, favorites, badge navigation,
completed verse history with Journey Stage markers,
translation and pack filters, and intentional empty states. Mastery requires
completed Learn, Recall, Strengthen, and Master waypoint records for the same
verse.

Vault replay uses Radiance content across all five ordered modes with no timer
and no hints. Session ownership, mastery, mode order, and submitted answers are
validated server-side. The isolated replay branch writes no campaign progress,
day reward, streak, hint, or cooldown state. Only terminal replay completion and
Vault Explorer badge evaluation persist.

**Acceptance note:** The project owner accepted every currently reachable Vault
flow. The mastered-verse replay manual test does not block phase completion and
remains explicitly deferred to the Phase 30 regression pass because the current
test learner has not yet mastered one verse across all four Journey Stages.

---

## Phase 24 — Sanctuary

**Goal:** Build the reflection and devotional space.

### Tasks

1. Create `features/sanctuary/`.
2. Show completed verse in full with user's preferred translation.
3. Display verse reflection and study note.
4. Build private notes: user can write, save, and edit a personal note for each verse (stored in DB per user per verse).
5. Favorite toggle: marks/unmarks a verse through the explicit
   `UserFavoriteVerse` relation.
6. Show Sonner toast on note save and favorite toggle.
7. Accessible from: automatic redirect after Day 3 completion, and as a standalone destination from the Vault.
8. Use the same server-authoritative study lifecycle everywhere: pre-study is
   open before Glimmer starts, content and replay lock during Glimmer through
   Radiance, and Sanctuary permanently reopens after Radiance.

**Implementation status (2026-08-01):** Complete and accepted after project-owner
manual mobile testing. Access is proven from the authenticated learner's
completed waypoint history on every read and mutation. The existing
`UserVerseNote` and `UserFavoriteVerse` constraints required no schema migration.

### Acceptance Criteria

- Private notes are visible only to the note's owner.
- Favorite toggles persist correctly.

- Sanctuary is calm and devotional — no game elements visible.

---

## Phase 25 — Oil Shop

**Goal:** Implement the Glow Points marketplace.

### Tasks

1. Create `features/oil-shop/`.
2. Create `oil-shop.repository.ts`:
   - `findActiveItems()`
   - `getUserInventory(userId)`
   - `purchaseItem(userId, itemId)` — full transaction: check balance → deduct → add to inventory → insert ledger record
3. Build `oil-shop-view.tsx`:
   - Current Glow Points balance displayed at top.
   - Grid of item cards (name, icon, cost in Glow Points, description).
   - Click item → preview modal with "Purchase" button.
   - On success: Sonner toast "Purchased [item name]!", balance updates.
   - On insufficient balance: Sonner error toast.
4. Seed 3–5 initial shop items including hint packs.

### Acceptance Criteria

- Purchases use a database transaction — no partial state possible.
- A user's balance cannot go negative.
- Hint pack purchases increase `HintUsage` allowance.

**Implementation status (2026-08-03):** Complete and project-owner accepted.
The initial catalogue contains 1-, 3-, and 5-hint consumables priced
at 50, 125, and 200 Glow Points. Purchases use a per-user transaction lock,
guarded balance deduction, immutable purchase entitlement snapshot, and negative
reward-ledger entry. Purchased hints extend every server-derived hint balance.

---

## Phase 26 — Fellowships

### Pre-Phase 26 localization foundation (2026-08-03)

- Added English, Spanish, and French player-interface locales with account preference,
  secure cookie, browser detection, and English fallback.
- Kept private gameplay URLs locale-neutral; public SEO pages may use locale
  prefixes when localized marketing content is introduced.
- Kept interface language independent from preferred Bible translation.
- Added a shared message contract and automated locale-parity test so later
  languages can be layered in without redesigning routes or features.
- Administrative screens remain English-only for this foundation pass.

**Implementation status:** Complete; manual English/Spanish responsive review
remains required before Phase 26 begins.

**Goal:** Implement social group features.

### Tasks

1. Create `features/fellowships/`.
2. Create `fellowship.repository.ts`: CRUD + member management + fellowship leaderboard query.
3. Build: fellowship list (public), create fellowship form, fellowship detail (members + leaderboard), join/leave actions.
4. Joining a fellowship triggers the "Community Member" badge evaluation.
5. Creating a fellowship triggers the "Faith Builder" badge evaluation.
6. Sonner toasts on: create, join, leave.

### Acceptance Criteria

- Users can create, join, and leave fellowships.
- Fellowship leaderboard shows member rankings without exposing emails.
- Badge evaluations fire correctly on join and create.

**Implementation status (2026-08-04): Complete.** Public discovery, private
invite-code joining, creation, member-safe detail views, fellowship ranking,
leaving, localized feedback, and trusted Community Member/Faith Builder badge
events are in place. The project owner completed functional and mobile manual
acceptance. A fellowship creator cannot leave until a future
leadership-transfer flow exists.

**Identity extension (2026-08-04):** Member cards now expose one route action
instead of duplicate View/Open controls. Leaders can edit the fellowship name,
description, public/private discovery status, and one of twelve curated
insignias. Insignias are server-validated catalogue keys backed by an app-owned
sprite atlas; arbitrary uploads and external image URLs are rejected.

**Private-access extension (2026-08-04):** Public and private fellowships are
both discoverable. Public membership remains immediate; private directory and
shared-link access create a durable learner-owned request. Leaders can approve
or reject individual applicants, learners can cancel pending requests, and
resolved decisions remain visible as bounded management history. Repository
authorization, advisory locks, unique request identity, and transactional
approval prevent forged decisions and duplicate membership.

---

## Phase 27 — Leaderboard (The Great Beacon)

**Goal:** Build the global, country, and fellowship leaderboards.

**Implementation status:** Implemented on 2026-08-04; automated TypeScript,
lint, badge-catalog, and localization checks pass. Project-owner responsive and
privacy acceptance remains pending before this phase is marked complete. The
Beacon Challenger activation migration has been applied successfully.

### Tasks

1. Create `features/leaderboard/`.
2. Create `leaderboard.repository.ts`:
   - `getGlobalRanking(page, limit)` — sorted by waypoints complete → Glow Points → streak
   - `getCountryRanking(country, page, limit)`
   - `getFellowshipRanking(fellowshipId)`
   - `getUserRank(userId)` — returns the user's position in each scope
3. Build `leaderboard-view.tsx` (The Great Beacon 🌟):
   - Tabs: Global / Country / My Fellowships (one tab per fellowship)
   - Top 3 podium display (animated)
   - Paginated table for positions 4+
   - Logged-in user's row always highlighted and pinned visible
4. **Never include email addresses, raw user IDs, or any private data in leaderboard responses.**
5. Add skeleton loaders.
6. Appearing in the global top 100 triggers "Beacon Challenger" badge evaluation.

### Acceptance Criteria

#### Approved Great Beacon refinement (2026-08-04)

- Glow Points remain the only spendable currency. Beacon XP is permanent,
  non-spendable progression; Weekly Beacon XP resets every Monday at 00:00 UTC.
- Eligible awards are 10 XP per mode, plus 25 for Glimmer, 40 for Glow, 60 for
  Radiance, and 100 for waypoint completion. Failed attempts, admin tests,
  Vault review, and other replays award nothing.
- Weekly leagues progress through Traveler, Disciple, Messenger, Watchman,
  Teacher, Shepherd, Elder, Scribe, and Saint in cohorts of up to 30. The top 7
  promote and bottom 5 demote; cohorts below 10 players do not demote anyone.
- Saint weekly finishes award lifetime Crowns: 5 for first, 3 for second, 2 for
  third, and 1 for positions four through ten.
- My League is the learner's cohort. Country and Fellowship rank Weekly Beacon
  XP without promotion effects. All Time ranks permanent Beacon Level and XP.
- Weekly ties use weekly waypoint completions, then the earliest final score
  timestamp. All week assignment and finalization remain server-authoritative.
- Each league has an independent emblem asset. The leaderboard's League Journey
  surface always exposes the complete Traveler-to-Saint path, distinguishing
  reached, current, and future leagues without relying on an image atlas.

- Leaderboard queries do not return email addresses.
- User's own rank is always visible regardless of pagination position.
- Country filter works based on the user's country setting.
- Player identity uses twelve bundled animal portraits rather than uploads.
  Leaderboard rows compose the selected portrait with a fixed standard frame or
  one of six Partner-only frames. Partner entitlement is persisted now and will
  be granted automatically by the later donation/subscription workflow.
- Packaged SVG country flags and a coarse five-minute presence indicator appear
  with real leaderboard portraits. Viewer-specific Trail Rivals fill sparse League and
  Country boards through deterministic idle days and simulated play sessions;
  every row gets a sequential visible position, while a rival's compass marker
  sits beside its name. Rivals never influence real standings, promotion,
  demotion, rewards, Fellowships, or All Time history.
- Rows foreground only Beacon Points. Selecting a player opens a compact dialog
  containing secondary Beacon progression statistics.
- Rank, Player, and Beacon Points headers align with the list. Podium positions
  use custom crowns and gold, silver, and bronze plates, while the signed-in
  learner uses a violet position treatment.
- The leaderboard table is composed for 375px first with compact rank plates,
  portraits, gaps, and score pills. Row padding provides breathing room while
  preserving the flexible player-name column.
- Protected large-screen pages now share an optional contextual-column
  composition. The leaderboard is its first adopter and uses already-loaded
  page data for a weekly rank, Beacon, Crown, and league snapshot without
  issuing another database query. Mobile remains a single focused column.
- The right column is owned by the protected application shell rather than
  styled as a floating page card. Its upper region accepts route-specific
  content, while a visual Become a Partner card remains anchored at its base
  across protected non-gameplay pages and links directly to Shop donations.
- Map and Admin routes deliberately omit the contextual column. Elsewhere the
  narrower rail is a flush continuation of the center surface, separated only
  by a border. Route panels must stay compact, avoid their own scrolling, and
  must not repeat information that the center already makes obvious.
- The shared protected navigation uses theme tokens in both light and dark
  modes. Its wide desktop form places each icon beside its label, while the
  compact tablet rail and mobile bottom navigation retain icon-first layouts
  and matching restrained elevation.

---

## Phase 28 — Admin Dashboard and Badge Management

**Goal:** Build the complete admin control center.

### Tasks

1. Create `features/admin/` with admin dashboard view.
2. Dashboard stats: total users, total verses, total waypoints with verses assigned, total badges, recently active users.
3. Links to: Verses, Packs, Waypoints, Badges, Users (Super Admin only), Settings (Super Admin only).
4. Build Badge Management screens (ADMIN+):
   - Badge list with stats (how many users have unlocked each)
   - Create badge form: name, description, icon, category, rarity, Glow Points reward, hidden toggle, unlock requirement
   - Edit badge form
   - Enable/disable toggle
5. Build User Management screens (SUPER_ADMIN only):
   - User list with search
   - Role change action — logged in audit trail
   - Account suspension
   - Manual badge award form — logged in audit trail
6. Role-protect all admin views through Proxy checks and verify authorization again in each Server Action and protected data-access path.

### Acceptance Criteria

- Regular Admin cannot access User Management.
- Super Admin manual badge award is always logged.
- Role changes are always logged.

---

## Phase 29 — Seed Data

**Goal:** Provide enough data for complete end-to-end testing.

### Tasks

1. Expand `prisma/seed.ts`:
   - 1 Super Admin user
   - 1 Regular Admin user
   - 2 test regular users
   - 10 verses with all three translations (NIV, ESV, KJV) and normalized text
   - 2 packs using those verses
   - Initial 220 waypoint records:
     - Waypoints 1–10 assigned to real verses with Journey Stage set
     - Demonstrate verse repetition: assign one verse at waypoints 1 and 5 with Learn and Recall stages respectively
     - Waypoints 11–220 created as placeholders (no verse assigned, inactive)
   - A sample set of badges across all six categories and all five rarities
   - 3–5 Oil Shop items

### Acceptance Criteria

- Seed runs cleanly with `prisma db seed`.
- A fresh developer can register, log in, and play through Waypoints 1–5 immediately after seeding.
- Verse repetition across waypoints (with different Journey Stages) is demonstrable.

---

## Phase 30 — Testing and QA

**Goal:** Verify all MVP flows work correctly and securely.

### Manual Test Flows

1. **Auth**: Register → Login → Logout → Login again → correct redirect.
2. **Admin route protection**: Login as regular user → try to visit `/admin` → confirm blocked.
3. **Verse management**: Admin creates a verse with all translations → publishes it → regular user cannot call create action.
4. **Waypoint assignment**: Admin assigns verse with LEARN stage to Waypoint 1, same verse with RECALL stage to Waypoint 5 → confirm both show correctly on map.
5. **Journey Stage rules**: Play Waypoint 1 (LEARN stage) → confirm hints are available. Play Waypoint 5 (RECALL stage) → confirm time limit shows. Play a Strengthen stage waypoint → confirm hint button is absent.
6. **Three-Day Challenge**: Complete all 5 modes for Day 1 → confirm flame added → confirm Day 2 shows cooldown → confirm server blocks Day 2 start before 24 hours.
7. **Cooldown bypass test**: Manually alter client state or time → attempt to start Day 2 early → confirm server rejects.
8. **Day 3 completion**: Complete Day 3 → confirm waypoint gets 3 flames → confirm next waypoint unlocks → confirm Glow Points awarded.
9. **Duplicate reward prevention**: Submit Day completion action twice → confirm points awarded only once.
10. **Badge trigger**: Complete a Learn stage day → confirm First Steps badge progress updates or unlocks.
11. **Hint system**: Use a hint on a LEARN stage → confirm count decrements. Attempt hint on STRENGTHEN stage → confirm it is refused.
12. **Oil Shop**: Purchase item → confirm balance deducted → confirm balance cannot go negative.
13. **Leaderboard privacy**: View leaderboard as any user → inspect all data → confirm no email addresses are visible.
14. **Private notes**: User A creates a note → User B logs in → User B cannot access User A's note.
15. **Mobile gameplay**: Run full mode flow on a mobile device or emulator → confirm tap-to-place works in all applicable modes.
16. **Vault replay**: After one verse has been completed across Learn, Recall,
    Strengthen, and Master, replay it from the Vault → confirm all five
    Radiance-level modes run without a timer or hints, completion returns to the
    Vault, campaign progression/rewards/streaks/cooldowns remain unchanged, and
    Vault Explorer progress is evaluated once.

**Deferred test note:** Vault replay remains on the final regression checklist
until a test learner has mastered the same verse across all four Journey Stages.

### Acceptance Criteria

- All 16 test flows pass.
- No known critical or high security issue remains unresolved.

---

## Phase 31 — Performance and Polish

**Goal:** Make the application feel production-ready.

### Tasks

1. Audit all database queries for N+1 problems — replace with batch queries or `include` where needed.
2. Add indexes identified during testing.
3. Ensure all data-heavy views use Server Components.
4. Use `"use client"` only where interactivity (event listeners, state) is genuinely required.
5. Add skeleton loaders to every screen that loads async data.
6. Ensure all loading states, empty states, and error states are present and visually polished.
7. Improve mobile layout on all screens — test on 375px width.
8. Ensure `prefers-reduced-motion` disables confetti and transition animations.
9. Audit all Sonner toast messages for clarity and tone consistency.
10. Run `tsc --noEmit` — fix all TypeScript errors.
11. Run lint — fix all lint errors.
12. Verify no `any` types exist.
13. Verify no `console.log` debug statements remain in production code.

### Acceptance Criteria

- App is fast and responsive on desktop and mobile.
- TypeScript passes with zero errors.
- Lint passes.
- No `any` types.
- `prefers-reduced-motion` is respected.

---

## Phase 32 — Final Security Audit

**Goal:** Verify the application against the complete security checklist before deployment.

### Tasks

1. Open `SECURITY-AUDIT.md`.
2. Work through every checklist item systematically.
3. Fix all Critical items before proceeding.
4. Fix all High items before deployment approval.
5. Document any Medium/Low items that are deferred with written acceptance.
6. Confirm these six things specifically:
   - No Prisma query exists outside a repository file.
   - No route file contains business logic.
   - No `any` type exists.
   - Journey Stage rules (hint/time) are enforced server-side.
   - Reward duplication is prevented by constraint and transaction.
   - No email addresses are exposed in any public-facing query.

### Acceptance Criteria

- Security checklist is complete.
- All Critical and High items are resolved.
- App is cleared for deployment review.

---

## Post-Roadmap Extras

### Independently Authored Fellowship Insignias

- Replace the current atlas-derived Fellowship insignias after the main game is
  complete. The atlas crops remain visually inconsistent because each painted
  medallion has different internal bounds even when its grid cell is centered.
- Create and export all twelve insignias as independent square assets with the
  medallion centered during composition, consistent transparent or approved
  game-background padding, and no neighboring artwork in the source file.
- Preserve the existing stable insignia keys so replacing the artwork requires
  no database migration and does not change existing Fellowship selections.
- Validate every replacement in the picker, Fellowship cards, and detail header
  at mobile and large-screen sizes before removing the atlas workflow.

### Large-Screen Contextual Player Panel

- Consider an optional right-side contextual panel for sufficiently wide player
  screens while preserving the focused single-column mobile and tablet layouts.
- Keep the shell consistent, but adapt its primary content to the current route:
  current journey action on Home and Map, verse context in Vault and Sanctuary,
  selected product in the Oil Shop, and selected achievement in Badges.
- Reuse existing systems such as Glow balance, available hints, streak progress,
  cooldowns, badges, and Luna reactions rather than inventing filler systems.
- Prioritize one visual action card and minimal supporting information so the
  result still feels like a game rather than a conventional SaaS dashboard.

### Player Map Replay

- Let players open a completed Glimmer, Glow, or Radiance card from Day
  Selection and choose an individual completed mode to practise.
- Mark the experience clearly as practice and keep it separate from the
  administrator-only Test Replay label.
- Create no campaign attempts and change no progression, cooldown, streak,
  waypoint history, or reward state.
- Award no Glow Points by default. If replay rewards are reconsidered, design a
  separately approved, rate-limited daily-review reward rather than an
  infinitely repeatable point.
- Keep Vault replay as the filtered, long-term mastery library; map replay is
  the convenient route back to recently completed challenge content.

---

*End of Scripture Memo AI Build Roadmap v2.0*
