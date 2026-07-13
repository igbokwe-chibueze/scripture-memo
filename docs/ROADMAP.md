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

**Implementation status (2026-07-13):** Implemented; automated verification
passes and project-owner manual acceptance remains. The protected `/game/map`
route loads the published curriculum and sparse learner progress in one batched
repository request, renders only one ten-waypoint group at a time, and includes
an original mobile-first winding trail, honest three-day progress rings,
responsive group navigation, current-node emphasis, safe locked-node feedback,
an empty state, and a matching route skeleton. The clickable destination URL is
established for Phase 12, which owns the Day Selection screen itself.

### Tasks

1. Create `features/map/`.
2. Create `map.repository.ts`:
   - `getUserMapData(userId)` — fetches all waypoint progress records for the user efficiently (batch query, not N+1)
3. Create `features/map/views/game-map-view.tsx`.
4. Group waypoints into sets of 10. Render one group at a time with scroll navigation between groups.
5. Use `<WaypointCard>` for each node. Display: number, Journey Stage badge, status, flame count.
6. Clicking a locked waypoint fires a Sonner info toast: "Complete Waypoint [N] to unlock this."
7. Clicking an unlocked or in-progress waypoint navigates to the Day Selection screen.
8. Add skeleton loaders while map data loads.
9. Highlight the user's current active (lowest in-progress or next unlocked) waypoint.

### Acceptance Criteria

- Map displays every current waypoint in groups of 10 and accommodates appended
  waypoints without a fixed maximum.
- Journey Stage badges are visible on each waypoint node.
- Waypoint status accurately reflects actual database progress.
- Locked waypoints are unclickable and show a toast explaining how to unlock.
- Skeleton loads correctly before data arrives.

---

## Phase 12 — Day Selection Screen

**Goal:** Allow users to select and begin available challenge days for a waypoint.

### Tasks

1. Create the Day Selection view inside `features/waypoints/views/day-selection-view.tsx`.
2. Display at the top: verse reference, current translation, Journey Stage badge.
3. If Journey Stage is Strengthen or Master: show a "No hints available at this stage" notice.
4. If Journey Stage is Recall or Master: show the time limit notice for this stage.
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

---

## Phase 13 — Gameplay Shared Engine

**Goal:** Build all shared gameplay infrastructure used by all five modes.

### Tasks

1. Create `features/gameplay/` with the full folder structure documented in `PRODUCT-OVERVIEW.md` §4.
2. Create `gameplay.repository.ts`:
   - `startSession(userId, waypointId, day)` — creates or retrieves active `GameSession`
   - `recordModeAttempt(sessionId, gameMode, isCorrect)`
   - `markModeComplete(sessionId, gameMode)`
   - `getSessionProgress(sessionId)` — returns which modes are complete
3. Create `features/gameplay/lib/`:
   - `verse-tokenizer.ts` — splits verse text into word tokens with index positions
   - `hidden-word-generator.ts` — selects which tokens to hide based on percentage; comments must explain the selection algorithm
   - `phrase-generator.ts` — splits verse into 3–6 word phrase chunks deterministically
   - `swap-generator.ts` — selects and swaps word tokens by position, not text; handles duplicate words; comments must explain position-based tracking
   - `answer-validator.ts` — normalizes both the user input and the correct answer before comparing; comments must explain why normalization is necessary
4. Create the game shell (`features/gameplay/components/game-shell.tsx`):
   - Displays: verse reference, Journey Stage badge, mode progress bar (Mode X of 5), hint button (hidden on Strengthen/Master), audio toggle
5. Create `startGameSessionAction` and `completeGameModeAction`:
   - `completeGameModeAction`: records the attempt, marks mode complete, then — if all 5 modes are complete — calls `completeDayAction`
   - `completeDayAction`: awards Glow Points (in a transaction), sets next day's unlock time, updates streak, evaluates badge progress, revalidates paths
6. Create `useAudioFeedback()` hook: checks user settings before playing any audio file.

### Acceptance Criteria

- A game session can be started for a valid, playable waypoint day.
- `completeGameModeAction` correctly detects when all 5 modes are done and triggers day completion.
- Answer validator passes case-insensitive, punctuation-stripped tests.
- Phrase generator returns the same phrases for the same input on retry.
- Swap generator correctly handles verses with duplicate words.

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

---

## Phase 15 — Puzzle Mode

**Goal:** Implement phrase-ordering mode.

### Tasks

1. Create `puzzle-mode.tsx` in `features/gameplay/components/modes/`.
2. Use `phrase-generator.ts` to split the verse into phrase chunks.
3. Same drag/tap mechanic as Drag & Drop but operating on phrase tiles.
4. Phrase tiles are visually wider and distinct from word tiles.
5. Validate correct phrase order on Check.
6. Apply difficulty based on current day level (percentage of phrases hidden).
7. On all correct: confetti, success toast, complete mode action.

### Acceptance Criteria

- Puzzle mode works for all three difficulty levels.
- Phrase generation is deterministic (same phrases on retry).
- Duplicate phrase issues handled by position tracking.

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

---

## Phase 17 — Cue Mode

**Goal:** Implement the first-letter cue recall mode (previously named Hint Mode).

### Tasks

1. Create `cue-mode.tsx` in `features/gameplay/components/modes/`.
2. Render blanks with first letter visible as a non-editable prefix (e.g., "L___").
3. Inputs take the remaining letters from the user.
4. Auto-advance when correct word length is reached.
5. Validate using `answer-validator.ts` (normalized comparison).
6. Apply green/red styling per input on Check.
7. On all correct: confetti, success toast, complete mode action.
8. Note: This mode is completely independent of the Hint System. A user's hint count has no effect on Cue Mode.

### Acceptance Criteria

- First-letter prefixes render correctly for all missing words.
- Validation is case-insensitive and punctuation-tolerant.
- Mode is named "Cue" throughout the UI, not "Hint."

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
7. On all correct: fire `completeGameModeAction`. Since Fill is Mode 5 (the last), this triggers `completeDayAction` automatically if all previous modes are recorded as complete.
8. `completeDayAction`:
   - Awards Glow Points using a database transaction.
   - Inserts a `RewardLedger` record.
   - Updates `UserStreak`.
   - Sets the next day's `unlockedAt` timestamp.
   - If Day 3: calls `markWaypointComplete` and `unlockNextWaypoint`.
   - Calls badge engine evaluation.
   - Fires Sonner success toast: "Day complete! +[points] Glow Points earned."
   - If waypoint complete: additional toast "Waypoint [N] complete! Next waypoint unlocked."

### Acceptance Criteria

- Completing Fill mode correctly triggers all downstream progression logic.
- Glow Points are not awarded twice if the action is called twice.
- The next day's unlock time is correctly set.
- Waypoint completion and next waypoint unlock happen atomically in a transaction.

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

---

## Phase 21 — Streak System

**Goal:** Track and display consecutive days of gameplay activity.

### Tasks

1. Create `streak-utils.ts` in `features/progression/lib/`:
   - `updateStreak(userId, activityDate)` — increments streak if consecutive day, resets if gap detected
   - `getStreakDisplay(streak: UserStreak): string` — returns "🔥 14-day streak"
2. Call `updateStreak` inside `completeDayAction` after a day is successfully completed.
3. Display streak in the game home screen header and on the user profile/vault.
4. Store both `currentStreak` and `longestStreak` in `UserStreak`.
5. Comment timezone handling: use user's stored timezone when determining calendar day boundaries; fall back to UTC.

### Acceptance Criteria

- Streak increments correctly on consecutive daily completions.
- Streak resets to 1 (not 0) on the day of activity after a missed day.
- Longest streak is retained even after a reset.

---

## Phase 22 — Badge System

**Goal:** Implement the complete badge achievement system.

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
4. Add empty states for each section.
5. Allow replaying a mastered verse from the Vault (creates a new session without affecting progression).

### Acceptance Criteria

- Mastered verses section only shows verses where all four Journey Stages are complete.
- Vault replay does not re-award Glow Points or affect main progression.
- Replaying a verse from the Vault triggers Vault Explorer badge evaluation.

---

## Phase 24 — Sanctuary

**Goal:** Build the reflection and devotional space.

### Tasks

1. Create `features/sanctuary/`.
2. Show completed verse in full with user's preferred translation.
3. Display verse reflection and study note.
4. Build private notes: user can write, save, and edit a personal note for each verse (stored in DB per user per verse).
5. Favorite toggle: marks/unmarks a verse as favorite, updates `UserProfile`.
6. Show Sonner toast on note save and favorite toggle.
7. Accessible from: automatic redirect after Day 3 completion, and as a standalone destination from the Vault.

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

---

## Phase 26 — Fellowships

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

---

## Phase 27 — Leaderboard (The Great Beacon)

**Goal:** Build the global, country, and fellowship leaderboards.

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

- Leaderboard queries do not return email addresses.
- User's own rank is always visible regardless of pagination position.
- Country filter works based on the user's country setting.

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

### Acceptance Criteria

- All 15 test flows pass.
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

*End of Scripture Memo AI Build Roadmap v2.0*
