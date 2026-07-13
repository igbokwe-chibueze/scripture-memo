# Scripture Memo — Production Technical Document
**Version:** 2.0  
**Purpose:** This document is the single source of truth for the Scripture Memo application. It covers product design, gameplay mechanics, progression systems, data models, architecture rules, UI/UX expectations, and implementation standards. Every AI agent and developer must read this document in full before writing any code.

---

## 1. Product Summary

Scripture Memo is a full-stack, interactive scripture memorization web
application. It guides users through a structured learning journey using an
expanding **Waypoint System** bootstrapped with 220 sequential records. Each
waypoint represents one scripture memory unit—normally one verse or verse range.

The platform is built on four scientifically grounded memorization principles:

1. **Spaced Repetition** — 24-hour cooldowns between challenge days enforce memory spacing.
2. **Progressive Difficulty** — five game modes and three difficulty levels per waypoint prevent plateau.
3. **Multi-Sensory Learning** — five interaction modalities (drag, arrange, swap, cue, type) engage different learning styles.
4. **Immediate Feedback** — color-coded results, audio cues, and animations reinforce correct recall.

The application combines two layered progression systems that work together:

- **The Three-Day Challenge System** — how a user completes a single waypoint (Glimmer → Glow → Radiance).
- **The Journey Stage System** — how a verse progresses across multiple waypoints over the expanding journey (Learn → Recall → Strengthen → Master).

These two systems are independent but complementary. A user always plays the full three-day challenge at each waypoint. The Journey Stage tells them which appearance of that verse they are currently working on.

---

## 2. Required Technology Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16.2.10 with App Router |
| Language | TypeScript (strict mode, no `any`) |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | Better Auth or equivalent production-ready auth layer |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form |
| Validation | Zod |
| Mutations | Server Actions (preferred over API routes) |
| Toasts | Sonner |
| Animations | Framer Motion or lightweight CSS transitions |
| Drag and Drop | @dnd-kit/core (handles both mouse and touch natively) |

Do not use API routes unless explicitly required for third-party webhooks, auth provider callbacks, or file upload provider requirements.

---

## 3. Architecture Rules

### 3.1 Root-Based Structure

Do not create a `src/` folder. Use a root-based structure.

```txt
app/
components/
features/
hooks/
lib/
prisma/
public/
types/
proxy.ts
next.config.ts
package.json
tsconfig.json
```

### 3.2 Feature-Based Architecture

Organize all code by business feature, not by technical type.

**Correct:**
```txt
features/waypoints/actions/
features/waypoints/components/
features/waypoints/repositories/
features/waypoints/views/
```

**Incorrect:**
```txt
actions/waypoints/
components/waypoints/
repositories/waypoints/
```

### 3.3 Thin Route Files

The `app/` directory is for routing only. Route files must be one-line re-exports of feature views. No business logic, Prisma access, JSX composition, or validation belongs in a route file.

```tsx
// app/(protected)/game/map/page.tsx
export { GameMapView as default } from '@/features/map/views/game-map-view'
```

### 3.4 Strict Data Flow

All mutations must follow this unidirectional flow:

```
View or Component
      ↓
Server Action        ← auth check, role check, Zod validation, orchestration
      ↓
Repository           ← the only place Prisma may be called
      ↓
Prisma
      ↓
Database
```

Rules:
- Components and views must never call Prisma.
- Server Actions must never call Prisma directly — always call a repository.
- Repositories are the only files allowed to import the Prisma client from `lib/prisma.ts`.
- Server Actions must validate all input with Zod before doing anything else.
- Server Actions must check authentication and authorization before accessing data.

### 3.5 Server Actions Over API Routes

Use Server Actions for all mutations. API routes are allowed only when a third-party service requires them (webhooks, OAuth callbacks, upload providers).

---

## 4. Full Project Folder Structure

```txt
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (marketing)/
│   ├── page.tsx
│   └── about/page.tsx
├── (protected)/
│   ├── game/page.tsx
│   ├── map/page.tsx
│   ├── waypoints/[waypointId]/page.tsx
│   ├── waypoints/[waypointId]/day/[day]/[mode]/page.tsx
│   ├── sanctuary/page.tsx
│   ├── vault/page.tsx
│   ├── vault/badges/page.tsx
│   ├── oil-shop/page.tsx
│   ├── fellowships/page.tsx
│   ├── leaderboard/page.tsx
│   └── settings/page.tsx
├── admin/
│   ├── page.tsx
│   ├── verses/page.tsx
│   ├── packs/page.tsx
│   ├── waypoints/page.tsx
│   ├── badges/page.tsx
│   ├── users/page.tsx
│   └── settings/page.tsx
├── layout.tsx
├── loading.tsx
├── error.tsx
├── not-found.tsx
└── globals.css

components/
├── ui/                          ← shadcn/ui primitives
├── shared/
│   ├── app-shell.tsx
│   ├── page-header.tsx
│   ├── empty-state.tsx
│   ├── loading-spinner.tsx
│   ├── loading-button.tsx
│   ├── confirmation-dialog.tsx
│   ├── countdown-timer.tsx
│   ├── status-badge.tsx
│   ├── stat-card.tsx
│   ├── form-error.tsx
│   ├── form-success.tsx
│   └── responsive-container.tsx
└── data-table/
    ├── data-table.tsx
    ├── data-table-pagination.tsx
    └── data-table-toolbar.tsx

features/
├── auth/
├── users/
├── verses/
├── packs/
├── waypoints/
├── gameplay/
├── progression/
├── rewards/
├── badges/
├── hints/
├── map/
├── sanctuary/
├── vault/
├── oil-shop/
├── fellowships/
├── leaderboard/
├── admin/
└── settings/

hooks/
├── use-debounce.ts
├── use-mobile.ts
└── use-transition-state.ts

lib/
├── auth.ts
├── prisma.ts
├── permissions.ts
├── constants.ts
├── utils.ts
├── rate-limit.ts
├── password.ts
├── dates.ts
├── logger.ts
└── safe-action.ts

prisma/
├── schema.prisma
└── seed.ts

types/
├── api.ts
├── common.ts
├── pagination.ts
└── permissions.ts
```

Each feature uses only the sub-folders it actually needs:

```txt
features/[feature-name]/
├── actions/        ← Server Actions: auth, validation, orchestration, revalidation
├── components/     ← Feature-specific reusable UI components
├── constants/      ← Feature-specific constants
├── data/           ← Static/seed data for this feature
├── hooks/          ← Feature-specific React hooks
├── lib/            ← Feature-specific pure helper functions
├── repositories/   ← All Prisma/database access — the only allowed location
├── schemas/        ← Zod validation schemas
├── types/          ← Feature-specific TypeScript types
└── views/          ← Full-page compositions imported by route files
```

Do not create empty folders. Create a folder only when files actually go inside it.

---

## 5. User Roles and Permissions

### 5.1 User (Regular Player)

- Register and log in.
- Play unlocked waypoints.
- Complete the three-day challenge for each waypoint.
- Earn Glow Points.
- Use hints (where the Journey Stage allows).
- View personal progress, stats, and badges.
- Join and participate in fellowships.
- View all leaderboard rankings.
- Access the Vault, Sanctuary, and Oil Shop.
- Update personal settings.

### 5.2 Regular Admin

- Create, edit, publish, and hide verses and translations.
- Create and manage packs.
- Assign verses to packs and reorder pack contents.
- Manage waypoint ordering and assignments.
- Create and manage badges.
- View user progress summaries.
- Use cooldown override for testing purposes.

### 5.3 Super Admin

Everything a Regular Admin can do, plus:

- Manage users and change roles.
- Manage global platform settings.
- Manage Bible translation library.
- Configure base Glow Point reward values.
- Award badges manually to specific users.
- Moderate fellowships.
- Run curriculum seeding tools.
- Access and manage audit logs.

---

## 6. Verses

A verse is the core content unit of the entire platform.

### 6.1 Verse Fields

| Field | Description |
|---|---|
| `id` | Unique internal identifier |
| `reference` | Server-generated human-readable reference, e.g., `John 3:16` |
| `book` | Selected from the 66-book Protestant canon |
| `chapter` | Chapter number validated against the selected book |
| `verseStart` | Starting verse validated against the selected chapter |
| `verseEnd` | Optional ending verse validated against the selected chapter and start |
| `reflection` | Short devotional thought for the Sanctuary |
| `studyNote` | Deeper teaching insight stored as Markdown; embedded HTML is not supported |
| `tags` | Array of category tags, e.g., `["love", "salvation"]` |
| `isActive` | Whether the verse is published and available |
| `createdBy` | Admin user ID |
| `updatedAt` | Audit timestamp |
| `translations` | Related `VerseTranslation` records |

### 6.2 Verse Translations

Translations are stored in a separate normalized table so additional translations can be added without modifying the base verse record.

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `verseId` | Foreign key to `Verse` |
| `translation` | Enum: `NIV`, `ESV`, `KJV` (expandable) |
| `text` | Full verse text in this translation |
| `normalizedText` | Lowercase, punctuation-stripped version — used for answer validation only |

**Important:** The `normalizedText` field is never shown to the user. It is used exclusively for server-side answer validation to allow case-insensitive, punctuation-tolerant comparisons.

### 6.3 Administrative CSV Import

Administrators can populate the verse library in batches of up to 100 rows using
the downloadable CSV template. The import requires canonical location fields and all
three MVP translations, applies the same validation and normalization as manual
creation, and displays a row-by-row preview before confirmation. Existing
references and repeated references within the file are skipped and reported;
bulk import never overwrites an existing verse. Accepted rows and the associated
admin audit record are written in one database transaction.

References are never authored directly in either the form or CSV file. They are
generated from book, chapter, starting verse, and optional ending verse after
validation against the exact NIV/KJV-compatible verse limits shared by all three
required translations. The compact structure dataset contains counts only and no
copyrighted Scripture text.

### 6.4 Learning Pack Lifecycle

A pack is an ordered themed collection of published verses. Packs are created
hidden so an administrator can prepare membership and ordering before learner
discovery. A pack requires at least one currently published verse before it can
be published. Removing its final verse automatically hides it; hidden packs keep
their metadata and ordering for later revision.

Pack membership is many-to-many: a verse may belong to multiple packs, but may
appear only once inside a given pack. Ordering is persisted through the
`PackVerse.position` field. Create, update, membership, reorder, publish, and hide
operations are ADMIN-authorized, transactional where multiple writes occur, and
recorded in `AuditLog` without copying Scripture text into audit metadata.

### 6.3 Translation Fallback

If a verse does not have the user's preferred translation, the system falls back to the default platform translation (configurable by Super Admin, defaulting to NIV).

---

## 7. The Waypoint System

### 7.1 What Is a Waypoint?

A waypoint is a sequential learning checkpoint in the user's journey. The
bootstrap curriculum contains **220 waypoints**, but 220 is not a permanent
maximum. Administrators append new waypoints as the curriculum grows. Numbers
remain one continuous sequence without year or cycle grouping. Each waypoint is
assigned one verse, which may appear at other waypoints in a different Journey
Stage.

**Important:** Verses intentionally repeat across multiple waypoints. The same verse may appear at waypoints 1, 18, 67, and 154 — each time in a progressively more difficult Journey Stage. This is by design, not an error.

### 7.2 Waypoint Fields

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `number` | Positive sequential position within the complete curriculum |
| `verseId` | The verse assigned to this waypoint |
| `journeyStage` | The stage of this verse appearance: `LEARN`, `RECALL`, `STRENGTHEN`, or `MASTER` |
| `isActive` | Whether the waypoint is published |

The first 220 waypoint records are seeded as hidden, unassigned placeholders. Because
the database requires a Journey Stage before a verse is assigned, new
placeholders use `LEARN` provisionally. That provisional value has no gameplay
effect while the waypoint is hidden. Assignment requires the administrator to
explicitly choose the intended Journey Stage, and a waypoint cannot be
published until it has a currently published verse.

Additional waypoints are created individually by administrators and always
append after the current final waypoint. They use the same hidden, unassigned,
provisional-`LEARN` defaults. The curriculum has no year grouping and historical
waypoints are never renumbered merely because new content is appended.

The administrative waypoint screen summarizes total, assigned, unassigned,
published, and hidden records so curriculum readiness is visible at a glance.

Published waypoints must form one continuous prefix followed by hidden drafts.
An administrator cannot publish across an earlier hidden gap or hide a waypoint
while a later published waypoint exists. Hidden future waypoints may be
reordered, but a published waypoint becomes position-locked as soon as learner
progress references it.

Administrators can use arrow controls for small one-position adjustments or a
**Move to position** control for long jumps. Direct moves update the proposed
order only, show the affected positions, and still require an explicit save.
Both interaction paths enforce the same published-prefix, Journey Stage, and
learner-history restrictions before the server performs its authoritative
validation.

Waypoint and verse history becomes permanent at the first learner-linked record.
A hidden waypoint with no history remains freely editable. A published but
unstarted waypoint must be hidden before its verse or Journey Stage can change.
Once any waypoint progress, day progress, or waypoint-linked game session exists,
the waypoint cannot be reassigned, hidden, or reordered. Its verse content also
becomes immutable so a learner's historical challenge cannot silently change.
Published waypoint dependencies prevent verse archival. No routine administrator
override exists in the initial system; any future exceptional correction workflow
requires a separately approved, reason-bearing, fully audited design.

### 7.3 Waypoint Progression Rules

- Waypoint 1 is the only waypoint unlocked for new users by default.
- All other waypoints are locked until the previous waypoint is fully completed.
- A waypoint is fully completed when all three days of its challenge are complete.
- Completing a waypoint's Day 3 automatically unlocks the next waypoint.
- A completed waypoint displays **three flames** on the map.
- A partially completed waypoint displays one or two flames depending on days completed.

### 7.4 User Waypoint Status Values

| Status | Condition |
|---|---|
| `LOCKED` | Previous waypoint not yet completed |
| `UNLOCKED` | Previous waypoint complete; this waypoint not yet started |
| `IN_PROGRESS` | At least Day 1 started but Day 3 not yet complete |
| `COOLDOWN` | Awaiting 24-hour cooldown before next day unlocks |
| `COMPLETED` | All three days complete |

---

## 8. The Journey Stage System

The Journey Stage System is a macro-level progression layer that tracks each
verse's repeated appearances across the expanding waypoint journey. It is
separate from and independent of the Three-Day Challenge System.

### 8.1 Journey Stages

| Stage | Icon | Purpose | Hints Available | Time Limit |
|---|---|---|---|---|
| **Learn** | 📖 | First introduction to the verse. Encourage engagement and initial familiarity. | Yes | None |
| **Recall** | 🧠 | Revisit the verse after several waypoints to test memory retention. | Yes | Yes (generous) |
| **Strengthen** | 💪 | Verse returns with increased difficulty and reduced support. | No | Yes (shorter) |
| **Master** | 👑 | Final challenge for this verse. Maximum difficulty, no assistance. | No | Yes (strict) |

### 8.2 How Journey Stages Work

Each verse progresses through four stages across separate waypoints. Example using John 3:16:

| Waypoint | Verse | Journey Stage | Appearance |
|---|---|---|---|
| Waypoint 1 | John 3:16 | Learn | 1st |
| Waypoint 18 | John 3:16 | Recall | 2nd |
| Waypoint 67 | John 3:16 | Strengthen | 3rd |
| Waypoint 154 | John 3:16 | Master | 4th |

At each of these waypoints, the user still completes the full Three-Day Challenge (Glimmer → Glow → Radiance). The Journey Stage affects the availability of hints and the presence of a time limit — not the challenge structure itself.

If a verse needs to appear more than four times (additional `MASTER` stage appearances), this is supported and may be added by admins.

A verse may have at most one `LEARN`, one `RECALL`, and one `STRENGTHEN`
appearance. `MASTER` may repeat. For each verse, waypoint order must never move
backwards through the stage sequence: Learn → Recall → Strengthen → Master.
Publishing a non-Learn appearance also requires its immediately preceding stage
to be published at an earlier waypoint.

### 8.3 Journey Stage Effects on Gameplay

| Rule | Learn | Recall | Strengthen | Master |
|---|---|---|---|---|
| Hints available | ✅ | ✅ | ❌ | ❌ |
| Time limit | ❌ | ✅ (generous) | ✅ (shorter) | ✅ (strict) |

These rules apply regardless of which of the five game modes is being played. If the Journey Stage disables hints, all modes within that waypoint have hints disabled.

### 8.4 Journey Stage Display

Every waypoint clearly displays its Journey Stage label. On the Day Selection screen and the Game Map, the stage badge is always visible so the player understands whether they are learning a new verse or revisiting one from memory.

### 8.5 Verse Mastery

After successfully completing the **Master** stage waypoint for a verse (all three days complete), that verse is considered **permanently mastered** within the main progression. The Vault displays mastered verses in a dedicated section. Players may replay any mastered verse from the Vault at any time without affecting main campaign progression.

---

## 9. The Three-Day Challenge System

Each waypoint contains three challenge days. The days must be completed in order. A 24-hour cooldown is enforced between days.

### 9.1 Day 1 — Glimmer

- Difficulty: Easy
- Words hidden: 20–35%
- Unlock condition: Available immediately when the waypoint is unlocked
- Glow Points reward: Base amount (X)

### 9.2 Day 2 — Glow

- Difficulty: Medium
- Words hidden: 40–60%
- Unlock condition: Day 1 complete
- Unlock timing: 24 hours after Day 1 completion
- Glow Points reward: 1.5× the Day 1 base

### 9.3 Day 3 — Radiance

- Difficulty: Hard
- Words hidden: 70–100%
- Unlock condition: Day 2 complete
- Unlock timing: 24 hours after Day 2 completion
- Glow Points reward: 2× the Day 1 base
- Completion effect: Waypoint marked complete, next waypoint unlocked

### 9.4 Cooldown Rules

- Cooldowns are enforced **server-side**. Client-side countdowns are display only and cannot be used to bypass the server check.
- Users see a real-time countdown timer on the Day Selection screen when a day is locked in cooldown.
- Regular Admins and Super Admins can bypass cooldowns for testing via a protected override action.
- Every cooldown override is recorded in the audit log.

### 9.5 Cooldown Calculation

```
Day 2 unlock time = Day 1 completedAt + 24 hours
Day 3 unlock time = Day 2 completedAt + 24 hours
```

The server computes whether a day is playable by comparing the current UTC timestamp against the stored unlock timestamp. The client never decides this.

---

## 10. The Five Game Modes

Each day of a waypoint requires the user to complete all five game modes **in this exact order**:

1. Drag & Drop
2. Puzzle
3. Swap
4. Cue
5. Fill

A day is not complete until all five modes are finished. Modes must be played in sequence. A user cannot skip to mode 3 without completing modes 1 and 2 first within the same day.

### 10.1 Shared Requirements for All Game Modes

Every game mode must include:
- Loading state before verse data loads
- Pending state while submitting completion
- Clear success and error feedback
- Sonner toast notification on completion
- Touch and mobile support
- Keyboard accessibility where practical
- Retry button
- Continue button after success
- Progress indicator showing current mode position (e.g., "Mode 2 of 5")
- Smooth transition animation between modes
- Confetti animation on successful completion
- Optional audio feedback for: pick, drop, correct, incorrect, complete

---

### 10.2 Game Mode 1 — Drag & Drop

**Concept:** Users see a verse with blanks and a shuffled word bank. They drag words from the bank into the correct blanks.

**Interaction:**
- Missing words appear as blank slots in the verse.
- All missing words are shown shuffled in a word bank below or above.
- Desktop: drag a word tile onto a blank.
- Mobile: tap a word to select it (highlight), then tap a blank to place it.
- Tapping or clicking a placed word returns it to the bank.
- The Check button validates all placements simultaneously.
- Correct placements highlight green; incorrect placements highlight red.
- On all correct: confetti fires, success toast appears, Continue button appears.

**Audio cues:** Pick (on drag start), drop (on placement), error (on failed check), correct (on full success).

**Reusable components required:**
- `word-bank.tsx`
- `blank-slot.tsx`
- `draggable-word.tsx`
- `placed-word.tsx`

---

### 10.3 Game Mode 2 — Puzzle

**Concept:** Instead of individual words, the verse is broken into phrase chunks of 3–6 words. Users arrange the phrase chunks in correct order.

**Interaction:**
- Same drag/tap mechanics as Drag & Drop but operating on phrase tiles instead of single words.
- Phrase bank shows shuffled phrase chunks.
- Difficulty scaling: Day 1 removes 20–35% of phrases; Day 2 removes 40–60%; Day 3 removes 70–100%.
- Phrase tiles are visually larger and more distinct than individual word tiles.
- On all correct: confetti, success toast, Continue button.

**Implementation note:** The phrase generator must be deterministic for a given verse, waypoint, day, and session. This prevents confusing reshuffles on retry.

**Purpose:** Teaches verse structure and theological flow, not just individual word recall.

---

### 10.4 Game Mode 3 — Swap

**Concept:** The full verse is displayed but a percentage of words have been swapped with other words. Users must identify and return swapped words to their correct positions.

**Interaction:**
- Swappable words are highlighted **yellow** by default.
- Clicking or tapping a yellow word turns it **purple** (selected state).
- Clicking or tapping another word while one is selected swaps the two words.
- Clicking or tapping the same selected word again deselects it (returns to yellow).
- The Check button validates all positions.
- Words in correct positions turn **green**; words still in wrong positions turn **red**.
- Difficulty: Day 1 — 20–35% swapped; Day 2 — 40–60%; Day 3 — 70–100%.
- On all correct: confetti, success toast, Continue button.

**Implementation note:** The swap generator must track token positions, not just word text. If the verse contains duplicate words (e.g., two instances of "the"), each instance is tracked by its index position to ensure fair and unambiguous validation.

---

### 10.5 Game Mode 4 — Cue

**Concept:** Blanks show the first letter of each missing word as a memory cue. Users type the complete word starting with that letter.

**Rename note:** This mode was previously called "Hint Mode" and has been renamed to **Cue Mode** to avoid confusion with the game's separate Hint System. Cue Mode and the Hint System are completely independent.

**Interaction:**
- Each blank shows the first letter of the missing word (e.g., "L_____" for "Lord").
- The first letter is pre-rendered and not editable.
- The user types the remaining letters to complete the word.
- Inputs auto-advance when the user reaches the correct word length.
- Validation uses normalized text (lowercase, punctuation-stripped).
- Same green/red visual feedback as Fill Mode.
- On all correct: confetti, success toast, Continue button.

---

### 10.6 Game Mode 5 — Fill

**Concept:** Users type all missing words into blank input fields with no visual cues.

**Interaction:**
- Blank fields appear inline within the verse text.
- No first-letter hint is shown.
- Input fields highlight **blue** when focused.
- When the typed word reaches the correct character length, focus automatically advances to the next blank.
- The Check button validates all inputs.
- Correct inputs highlight **green**; incorrect inputs highlight **red**.
- On all correct: confetti, success toast. Completing Fill Mode also triggers day completion logic.

**Note:** Fill Mode is the final mode of each day. Its successful completion triggers the `complete-day` Server Action, which awards Glow Points, updates the streak, sets the cooldown for the next day, and — if Day 3 — marks the waypoint complete and unlocks the next waypoint.

---

## 11. The Hint System

The Hint System is a separate gameplay assistance mechanism that is independent of Cue Mode. Hints reveal the full verse text for reference during gameplay.

### 11.1 Hint Rules

- Each user receives a free hint allowance (default configurable by Super Admin).
- Users may purchase additional hints from the Oil Shop using Glow Points.
- **Hints are only available during the Learn and Recall Journey Stages.**
- Hints are completely disabled during the Strengthen and Master Journey Stages, regardless of the game mode being played.
- Using a hint is recorded in `HintUsage`.
- Hint usage may optionally reduce Glow Points earned for the session (configurable).

### 11.2 Hint Interaction

- A Hint button is visible in the game shell when hints are available for the current Journey Stage.
- Clicking the Hint button opens a modal showing the full verse text.
- A Sonner toast fires confirming "Hint used. X hints remaining."
- The Hint button becomes disabled and shows a count of zero when no hints remain.
- When the Journey Stage is Strengthen or Master, the Hint button is not rendered at all.

---

## 12. Glow Points and Rewards

### 12.1 How Glow Points Work

Glow Points are the sole reward currency of Scripture Memo. There is no separate XP or experience system. Glow Points serve two purposes: they represent achievement and they are spent in the Oil Shop.

### 12.2 Reward Schedule

| Day | Reward |
|---|---|
| Day 1 — Glimmer | Base amount (X, configured by Super Admin) |
| Day 2 — Glow | 1.5 × base |
| Day 3 — Radiance | 2 × base |

The default base reward is **100 Glow Points** until a Super Admin override is
configured. New users start with a balance of **0 Glow Points**; the base reward
is an earning rate, not a starting balance. The default free hint allowance is
**5 hints** per user.

### 12.3 Reward Rules

- Points are awarded server-side only. The client never sends a point amount.
- Reward values are read from server-side constants or admin-configured settings.
- A user cannot earn duplicate points for the same completed day. This is enforced by a unique constraint on `(userId, waypointId, day)` in the `RewardLedger` and by using database transactions.
- Every point award is recorded as an immutable entry in `RewardLedger` with a reason string.
- Badges may additionally reward Glow Points when unlocked (see Badge System).

---

## 13. The Streak System

### 13.1 How Streaks Work

A streak tracks the number of consecutive days on which a user completes at least one meaningful gameplay activity (completing a game mode).

### 13.2 Streak Rules

- Streak increments when the user completes meaningful gameplay activity on a given calendar day.
- Streak calculation must use the user's configured timezone where possible, falling back to UTC.
- Missing a full calendar day resets the streak to zero.
- The user's current streak and all-time best streak are stored separately.
- Streaks are displayed on the game home screen, the user profile, and the leaderboard.

---

## 14. The Badge System

The Badge System is a permanent achievement system that recognizes and celebrates player accomplishments. Badges cannot be purchased, traded, or lost. They are permanent milestones.

### 14.1 Badge Philosophy

Badges encourage positive long-term behaviors:
- Memorizing more Scripture
- Maintaining learning streaks
- Improving accuracy
- Increasing speed
- Becoming less dependent on hints
- Exploring all areas of the platform
- Participating in community features
- Reaching important milestones

### 14.2 Badge Data Model

Each badge record contains:

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `name` | Display name |
| `description` | Short explanation of how to earn the badge |
| `icon` | Emoji or icon key |
| `category` | Badge category (see below) |
| `rarity` | `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, or `LEGENDARY` |
| `glowPointReward` | Optional Glow Points awarded on unlock |
| `isHidden` | Whether the badge is hidden until unlocked |
| `isActive` | Whether the badge is currently enabled |
| `unlockRequirement` | Structured requirement definition used by the badge engine |

User progress toward each badge is stored in a separate `UserBadgeProgress` record:

| Field | Description |
|---|---|
| `userId` | Foreign key to User |
| `badgeId` | Foreign key to Badge |
| `progressCurrent` | Current progress value |
| `progressTarget` | Required value to unlock |
| `unlocked` | Whether the badge has been earned |
| `unlockedAt` | Timestamp of unlock |

### 14.3 Badge Categories

**📖 Learning** — Awarded for memorizing and mastering Scripture.

Examples:
- 🌱 First Steps — Complete your first Learn stage.
- 📚 Verse Scholar — Master 10 verses.
- 📜 Scripture Keeper — Master 25 verses.
- 👑 Scripture Master — Master 50 verses.
- 🕊️ Living Word — Master 100 verses.

**🔥 Streak** — Rewards consistent daily engagement.

Examples:
- 🔥 Consistent Learner — Maintain a 7-day streak.
- ⚡ Dedicated Student — Maintain a 30-day streak.
- 🏆 Faithful Warrior — Maintain a 100-day streak.
- 🌟 Unbreakable — Maintain a 365-day streak.

**🎯 Mastery** — Rewards exceptional performance.

Examples:
- 💯 Perfectionist — Complete 10 game sessions with 100% accuracy on first attempt.
- 🧠 Verse Champion — Complete all four Journey Stages of a single verse.
- ⚡ Lightning Memory — Complete a Master stage waypoint before the time limit expires.
- 🎖️ Master of Recall — Complete 50 Recall stage waypoints.

**🚫 Independence** — Rewards players for relying on memory rather than assistance.

Examples:
- 🙈 No Looking Back — Complete a Learn stage waypoint without using any hints.
- 🚫 Hint Free — Complete 20 Strengthen stage waypoints without hints.
- 🧠 Memory Machine — Complete 50 Master stage waypoints without hints.

**⚡ Speed** — Rewards quick and accurate memorization.

Examples:
- ⚡ Quick Thinker — Complete a Recall stage within the bonus time threshold.
- 🚀 Speed Demon — Complete 25 timed stages.
- ⏱️ Against the Clock — Complete 100 timed stages.

**🌍 Exploration** — Encourages players to experience every feature of the platform.

Examples:
- 📖 Vault Explorer — Replay 25 mastered verses through the Vault.
- 👥 Community Member — Join your first Fellowship.
- 🤝 Faith Builder — Create a Fellowship.
- 🌟 Beacon Challenger — Appear on the Global Leaderboard top 100.

### 14.4 Badge Rarity

| Rarity | Color | Purpose |
|---|---|---|
| ⚪ Common | Grey | Introductory achievements earned during early gameplay |
| 🟢 Uncommon | Green | Early progression milestones |
| 🔵 Rare | Blue | Significant accomplishments requiring sustained effort |
| 🟣 Epic | Purple | Difficult achievements requiring high dedication |
| 🟡 Legendary | Gold | Highest-level accomplishments representing exceptional commitment |

Higher rarity badges should have increasingly elaborate unlock animations. Legendary badge unlocks receive the most dramatic celebration.

### 14.5 Hidden Badges

Some badges may be marked `isHidden: true`. Players see these as:

> ❓ Secret Badge — Unlock this achievement to discover it.

The badge name and description remain hidden until unlocked. This creates curiosity and encourages exploration.

### 14.6 Badge Unlock Celebration

When a badge is unlocked:
1. Confetti animation plays.
2. A celebration modal appears showing: badge icon, badge name, congratulation message, rarity label, and Glow Points reward (if any).
3. A unique badge unlock sound plays.
4. The player's badge collection and Glow Points balance update automatically.

Legendary badges receive a more dramatic animation than Common badges. The modal should visually distinguish rarity levels through color and animation intensity.

### 14.7 Badge Progress Tracking

Many badges support live progress tracking. Example display:

```
🏆 Verse Scholar
Master 10 verses
Progress: 7 / 10  [███████░░░]
```

Progress updates automatically after every relevant event without requiring a page refresh. Players should always see exactly how close they are to earning a badge.

### 14.8 Badge Engine

The badge engine is a server-side event listener. It evaluates badge progress whenever a relevant event occurs:

Events that can trigger badge evaluation:
- Completing a game mode
- Completing a waypoint day
- Completing a Journey Stage
- Maintaining a streak
- Using or not using hints
- Joining a fellowship
- Creating a fellowship
- Replaying a verse from the Vault
- Appearing on the leaderboard

The badge engine should be implemented as a helper function called within the relevant Server Actions (e.g., after `complete-day.action.ts` awards points, it also calls `evaluateBadgeProgress(userId, event)`).

### 14.9 Badge Collection Page

Accessible from the Vault. Displays all badges the player can earn.

Each badge card shows:
- Badge icon
- Badge name
- Description
- Category label
- Rarity indicator (color-coded)
- Progress bar
- Glow Point reward (if applicable)
- Date earned (if unlocked)
- Completion status (unlocked / in-progress / locked)

Locked badges remain visible unless marked hidden. Players can filter by: Category, Rarity, Completed, In Progress, Locked.

### 14.10 Badge Administration

Admins manage badges in a dedicated **Badge Management** section of the admin panel.

Admin capabilities:
- Create new badges
- Edit badge details (name, description, icon, rarity, requirement)
- Enable or disable badges
- Change badge rarity
- Preview badge icon and unlock animation
- View badge statistics (how many players have unlocked each badge)

Super Admin additional capabilities:
- Award a badge manually to a specific user (emergency use only, logged in audit trail)

Badge progress is always calculated automatically by the badge engine. Admins should never directly edit a player's progress value.

---

## 15. Feature Pages and Navigation

### 15.1 Game Home

The landing page after login. Shows:
- User's current Glow Points and streak
- Current active waypoint and its Journey Stage
- Quick-access button to resume gameplay
- Navigation to all main sections

### 15.2 Game Map (🗺️)

Visual grid of all current waypoints.

- Waypoints rendered in scrollable groups of 10—not the entire expanding
  curriculum at once.
- Each waypoint node shows: number, Journey Stage badge, status (locked/unlocked/in-progress/complete), flame count.
- Clicking a locked waypoint shows a Sonner toast explaining how to unlock it.
- Clicking an unlocked or in-progress waypoint navigates to its Day Selection screen.
- Skeleton loaders shown while map data loads.

### 15.3 Day Selection Screen

For a selected waypoint:
- Verse reference and preferred translation displayed
- Journey Stage badge clearly visible
- Day 1 (Glimmer), Day 2 (Glow), Day 3 (Radiance) cards
- Each day card shows: status, reward preview, flame indicator if complete
- For cooldown days: real-time countdown timer (`CountdownTimer` component)
- Start button for days that are ready
- Sonner toast when user tries to click a locked or cooldown day

### 15.4 Sanctuary (🕊️)

Reflection space shown after completing a day or as a standalone destination.
- Full verse displayed with the user's preferred translation
- Reflection question and study note
- Private notes: user can write and save a personal note about the verse
- Favorite toggle: mark the verse as a favorite
- Calm, devotional UI — no game mechanics visible

### 15.5 Vault (📖)

The user's complete progress library.
- Completed verses with mastery status (Learn / Recall / Strengthen / Master complete)
- Mastered verses section (all four stages complete)
- Favorite verses
- In-progress waypoints
- Personal stats: total Glow Points, current streak, best streak, total waypoints complete, total hints used
- Full badge collection (link to `/vault/badges`)
- Filter by translation, pack, completion status

### 15.6 Oil Shop (🛢️)

Marketplace for spending Glow Points.
- Current Glow Points balance displayed prominently at top
- Grid of available shop items (extra hints, profile themes, map cosmetics, flame styles)
- Clicking an item opens a preview modal with description and cost
- Purchase button deducts Glow Points via a server-side transaction
- On success: Sonner toast "Purchased [item name]!" and balance updates
- On insufficient Glow Points: error Sonner toast

### 15.7 Fellowships (👥)

Social group system.
- View fellowships the user belongs to
- Browse/search public fellowships to join
- Create a fellowship (name, description, public/private setting)
- View fellowship members and their progress
- Fellowship-specific leaderboard
- Join via invite code or public listing
- Leave a fellowship

### 15.8 The Great Beacon (🌟) — Leaderboard

Global rankings across three scopes:
- **Global** — all users, sorted by waypoints completed → Glow Points → current streak
- **Country** — users filtered by the logged-in user's country setting
- **Fellowship** — one tab per fellowship the user belongs to

Display:
- Podium display for top 3 (animated presentation)
- Paginated table for positions 4 and beyond
- The logged-in user's own row is always highlighted and pinned visible even when scrolling
- No email addresses are ever displayed — only display name, country flag, and stats

### 15.9 Settings

User settings:
- Display name
- Country (used for country leaderboard)
- Preferred Bible translation (NIV / ESV / KJV)
- Audio effects on/off
- Reduced motion preference
- Theme preference (light/dark/system)

Admin settings (Super Admin only):
- Default platform translation
- Base Glow Points amount (X)
- Default hint allowance per user
- Cooldown override policy

---

## 16. Reusable Components

Build the following as shared, reusable components before implementing features that need them.

### 16.1 Root-Level Shared Components (`components/shared/`)

| Component | Purpose |
|---|---|
| `<PageHeader>` | Consistent page title + optional subtitle + optional action slot |
| `<EmptyState>` | Icon/illustration + title + description + optional CTA button |
| `<LoadingSpinner>` | Centered animated spinner, accepts `size` prop (`sm`, `md`, `lg`) |
| `<LoadingButton>` | Button that shows spinner and disables itself while `isPending` |
| `<ConfirmationDialog>` | Modal: title + message + confirm button (customizable label/color) + cancel |
| `<CountdownTimer>` | Accepts `targetDate: Date`, counts down live in HH:MM:SS, fires `onExpire` callback |
| `<StatusBadge>` | Pill badge with status label and color, accepts `status` prop |
| `<StatCard>` | Displays a stat label + value + optional icon in a card |
| `<FormError>` | Inline form error message block |
| `<FormSuccess>` | Inline form success message block |
| `<ResponsiveContainer>` | Max-width container with responsive horizontal padding |

### 16.2 Gameplay-Specific Shared Components (`features/gameplay/components/`)

| Component | Purpose |
|---|---|
| `<GameShell>` | Wrapper for all game modes: shows progress header, hint button, audio toggle, verse reference |
| `<GameProgressHeader>` | Shows current mode position (e.g., "Mode 3 of 5") and Journey Stage badge |
| `<WordBank>` | Scrollable bank of draggable/tappable word tiles |
| `<BlankSlot>` | Droppable blank slot within verse text |
| `<DraggableWord>` | Individual word tile that can be picked and placed |
| `<PlacedWord>` | Word tile in a placed/settled state, clickable to return to bank |
| `<VerseDisplay>` | Renders full verse text with reference and translation label |
| `<FeedbackBanner>` | Shows correct/incorrect result counts after Check is pressed |
| `<ConfettiCelebration>` | Triggers full-screen confetti animation, controlled by `show: boolean` |
| `<AudioFeedback>` | Plays audio cues; reads audio-enabled setting from context |
| `<HintButton>` | Shows remaining hints count; opens hint modal on click; hidden on Strengthen/Master stages |
| `<FlameIndicator>` | Shows 0, 1, 2, or 3 flame icons for waypoint day completion |
| `<WaypointCard>` | Waypoint tile for the game map with status, number, stage, and flame count |
| `<DayCard>` | Day challenge card with name, status, reward preview, and countdown timer |
| `<JourneyStageBadge>` | Pill showing Learn / Recall / Strengthen / Master with stage-appropriate color |

---

## 17. Database Model Plan

Use Prisma with PostgreSQL. This section lists required models. The implementation agent should create a complete schema with all relations, indexes, constraints, timestamps, and enums.

### 17.1 Core Enums

```prisma
enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum TranslationCode {
  NIV
  ESV
  KJV
}

enum WaypointStatus {
  LOCKED
  UNLOCKED
  IN_PROGRESS
  COOLDOWN
  COMPLETED
}

enum JourneyStage {
  LEARN
  RECALL
  STRENGTHEN
  MASTER
}

enum DayLevel {
  GLIMMER
  GLOW
  RADIANCE
}

enum GameMode {
  DRAG_DROP
  PUZZLE
  SWAP
  CUE
  FILL
}

enum CompletionStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum BadgeCategory {
  LEARNING
  STREAK
  MASTERY
  INDEPENDENCE
  SPEED
  EXPLORATION
}

enum BadgeRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

enum RewardEventType {
  DAY_COMPLETE
  BADGE_UNLOCK
  MANUAL_ADMIN_AWARD
}
```

### 17.2 Required Models

- `User`
- `UserProfile`
- `UserSettings`
- `Verse`
- `VerseTranslation`
- `Tag`
- `VerseTag`
- `Pack`
- `PackVerse`
- `Waypoint` (includes `journeyStage` field)
- `UserWaypointProgress`
- `UserDayProgress`
- `GameSession`
- `GameModeAttempt`
- `HintUsage`
- `RewardLedger`
- `UserStreak`
- `Badge`
- `UserBadgeProgress`
- `Fellowship`
- `FellowshipMember`
- `ShopItem`
- `UserShopPurchase`
- `UserVerseNote` (one private Sanctuary note per user and verse)
- `UserFavoriteVerse` (explicit user-to-verse favorite relation)
- `AuditLog`
- Auth tables required by the chosen auth provider (sessions, accounts, verification tokens)

`User` also stores account-suspension state. `GameSession` distinguishes normal
waypoint sessions from Vault replays so replay attempts can never advance the
campaign or award Glow Points.

### 17.3 Critical Database Rules

- Store immutable reward history in `RewardLedger` — never update a balance field alone without a ledger entry.
- Use a **unique constraint** on `(userId, waypointId, dayLevel)` in `UserDayProgress` to prevent duplicate completions at the database level.
- Use **database transactions** when: completing a game mode, completing a day, awarding Glow Points, unlocking the next waypoint, purchasing shop items, joining/leaving fellowships.
- Store `normalizedText` in `VerseTranslation` for server-side answer validation.
- Keep translation records separate from the base verse record for extensibility.
- Add indexes on relational progress keys such as `(userId, waypointId)`.
- Add descending indexes on the actual leaderboard sort fields:
  `UserProfile.totalWaypointsCompleted`, `UserProfile.totalGlowPoints`, and
  `UserStreak.currentStreak`. Country and fellowship filters use supporting
  indexes on their filter keys.

---

## 18. Server Actions Reference

### Auth Actions
- `loginAction` — validate credentials, create session
- `registerAction` — validate input, create user and profile
- `logoutAction` — destroy session
- `updateProfileAction` — update display name, country, avatar

### Admin Verse Actions (ADMIN+)
- `createVerseAction`
- `updateVerseAction`
- `archiveVerseAction`
- `publishVerseAction`
- `addTranslationAction`
- `updateTranslationAction`

### Admin Pack Actions (ADMIN+)
- `createPackAction`
- `updatePackAction`
- `addVerseToPackAction`
- `removeVerseFromPackAction`
- `reorderPackVersesAction`
- `publishPackAction`

### Admin Waypoint Actions (ADMIN+)
- `createWaypointAction`
- `assignVerseToWaypointAction`
- `reorderWaypointsAction`
- `publishWaypointAction`
- `overrideCooldownAction` — logged in audit trail

### Admin Badge Actions (ADMIN+)
- `createBadgeAction`
- `updateBadgeAction`
- `toggleBadgeActiveAction`

### Admin Badge Actions (SUPER_ADMIN only)
- `awardBadgeManuallyAction` — logged in audit trail

### Gameplay Actions
- `startGameSessionAction`
- `completeGameModeAction` — records attempt, evaluates badges
- `completeDayAction` — awards Glow Points, sets next cooldown, evaluates badges
- `unlockNextWaypointAction` — triggered after Day 3 completion
- `useHintAction` — decrements hint count, records usage

### Rewards Actions
- `awardGlowPointsAction` — always called through `completeDayAction`, never directly from UI

### Fellowship Actions
- `createFellowshipAction`
- `joinFellowshipAction`
- `leaveFellowshipAction`

### Settings Actions
- `updateUserSettingsAction`
- `updateAdminSettingsAction` (SUPER_ADMIN only)

### Every Server Action Must:
1. Validate input with Zod schema (step 1, before anything else)
2. Verify authentication (`session.user` must exist)
3. Verify authorization (role check where applicable)
4. Call repositories — never Prisma directly
5. Use a database transaction where multiple writes occur
6. Revalidate affected paths with `revalidatePath`
7. Return a typed `ActionResult<T>` response
8. Trigger Sonner toast from the UI component based on the returned result

---

## 19. UI/UX Requirements

### 19.1 Required States

Every interactive feature must account for all of these states:

| State | Implementation |
|---|---|
| Loading (route-level) | `loading.tsx` files + Next.js Suspense |
| Loading (component-level) | Skeleton components or `<LoadingSpinner>` |
| Pending (form submission) | `<LoadingButton>` with `isPending` prop; disable to prevent double-submit |
| Success | Sonner toast (success variant) |
| Error | Sonner toast (error variant) + inline form errors where relevant |
| Empty | `<EmptyState>` component with guidance |
| Disabled | Visually distinct; prevents interaction during async operations |

### 19.2 Sonner Toast Usage

Use Sonner for all user-facing feedback. Never use `alert()`. Never silently fail.

| Category | Examples |
|---|---|
| Success | "Login successful.", "Verse created.", "Day completed. +120 Glow Points earned.", "Badge unlocked! Verse Scholar 🏅" |
| Error | "Invalid email or password.", "Something went wrong. Please try again.", "Not enough Glow Points." |
| Info | "Day 2 unlocks in 23h 14m.", "Hint used. 2 hints remaining." |
| Warning | "You only have 1 hint remaining.", "Unsaved changes will be lost." |

- Error toasts persist until dismissed by the user.
- All other toasts auto-dismiss after 4 seconds.

### 19.3 Gameplay Visual Feedback Reference

| State | Color |
|---|---|
| Input focused | Blue |
| Answer correct | Green |
| Answer incorrect | Red |
| Word selected (Swap mode) | Purple |
| Word swappable (Swap mode) | Yellow |
| Day complete | Flame icon rendered |
| Waypoint complete | 3 flame icons |
| Cooldown active | Greyed-out card + countdown timer |

### 19.4 Audio

Audio files live in `public/audio/`. Use a `useAudioFeedback()` hook that reads `audioEnabled` from user settings before playing anything.

Required audio files:
- `pick.mp3` — word picked up in drag/puzzle mode
- `drop.mp3` — word placed in a slot
- `error.mp3` — incorrect answer on Check
- `correct.mp3` — correct answer on Check
- `day-complete.mp3` — day completion
- `waypoint-complete.mp3` — waypoint fully mastered
- `badge-unlock.mp3` — badge earned

### 19.5 Accessibility

- Keyboard navigation in all game modes where practical.
- ARIA labels on all interactive elements.
- Respect `prefers-reduced-motion` system preference (disable confetti and transition animations).
- `<CountdownTimer>` must use `aria-live` for screen reader announcements.

---

## 20. Comments and Documentation Standards

Code must be commented extensively. Comments must explain **why** a decision was made, not just what the code does.

Required comment locations:
- Every repository method: explain the query's purpose and any non-obvious filtering.
- Every Server Action: explain auth checks, validation sequence, and business rules.
- The cooldown enforcement logic: explain why it is server-side only and what the client timer does differently.
- The `normalizedText` validation: explain why text is normalized before comparison.
- The swap generator: explain why token positions are tracked instead of word text.
- The phrase generator: explain why it is deterministic and what would happen if it were not.
- The reward ledger: explain why points are never applied without a corresponding ledger record.
- The badge engine: explain the event-driven evaluation pattern.
- Permission checks in admin actions: explain the role hierarchy being enforced.

**Good comment:**
```ts
// Cooldowns are checked server-side because client-side countdown timers are purely
// cosmetic. A user could manipulate browser state or send a direct network request
// to bypass a client timer. The server compares the current UTC timestamp against
// the stored unlock timestamp before allowing any day to start.
```

**Bad comment:**
```ts
// check if unlocked
if (isUnlocked) { ... }
```

---

## 21. Security Requirements

- Validate all user input with Zod in every Server Action, before any other logic.
- Use the root `proxy.ts` file for optimistic redirects away from protected routes.
- Verify authentication and authorization again close to every protected data access and mutation; Proxy is not a complete authorization boundary.
- Enforce role checks server-side in every admin and Super Admin action.
- Never trust client-side cooldown status — always check server-side.
- Never trust client-side reward values — always calculate server-side.
- Never trust client-side game completion status — always verify the session in the database.
- Prevent duplicate reward claims using database unique constraints and transactions.
- Never expose user email addresses in leaderboards, fellowship member lists, or any public-facing data.
- Sanitize all user-generated content (display names, fellowship names, private notes) before rendering.
- Rate-limit sensitive actions: login, registration, password reset, game completion submissions.
- Use secure cookies managed by the auth provider.
- Log all admin actions (cooldown overrides, manual badge awards, role changes) in the audit log.
- See `SECURITY-AUDIT.md` for the complete security checklist.

---

## 22. MVP Scope

### Include in MVP

- Authentication (register, login, logout)
- User profile and settings
- Admin verse management (create, edit, translate, publish)
- Admin pack management
- Admin waypoint management with Journey Stage assignment
- Admin badge management
- Expandable game map initialized with the 220 bootstrap waypoints
- Journey Stage display on all relevant screens
- Day Selection screen with cooldown countdown
- All five game modes (Drag & Drop, Puzzle, Swap, Cue, Fill)
- Three-day challenge system with 24-hour cooldown
- Hint system (disabled on Strengthen and Master stages)
- Glow Points and reward ledger
- Streak system
- Badge system with six categories
- Vault (progress archive and badge collection)
- Sanctuary (reflection space)
- Oil Shop (basic items)
- Fellowships (create, join, leave)
- Leaderboard (global, country, fellowship)
- Loading states throughout
- Sonner toasts throughout
- Security checks throughout

### Defer Post-MVP

- Advanced Oil Shop cosmetics (map skins, flame styles)
- Fellowship moderation tools
- Push notifications
- Advanced analytics dashboard
- Bulk verse import UI
- Mobile app wrapper

---

## 23. Definition of Done

The application is production-ready when:

- All MVP features work end-to-end in all supported scenarios.
- All routes follow root-based feature-based architecture.
- Route files are one-line view exports — no logic.
- Server Actions are used for all mutations.
- Prisma is called only inside repository files.
- All forms use React Hook Form with Zod resolvers.
- Every async operation has loading and error states.
- Sonner toasts are implemented for all user-facing outcomes.
- Cooldowns are enforced server-side.
- Rewards cannot be duplicated (tested manually and verified by constraint).
- Journey Stage rules (hint availability, time limit) are enforced server-side.
- Badge progress evaluates after every relevant event.
- Admin permissions are enforced at the action level, not just at the route level.
- Core flows have been tested manually per the QA checklist in `SECURITY-AUDIT.md`.
- No `any` type exists in the codebase.
- TypeScript passes with `tsc --noEmit`.
- Lint passes.
- Code is commented clearly and meaningfully throughout.

---

*End of Scripture Memo Production Technical Document v2.0*
