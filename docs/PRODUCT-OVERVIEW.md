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

### 2.1 Password recovery delivery modes

Password recovery is implemented with Better Auth. Better Auth is the sole
owner of reset-token generation, one-hour expiry, validation, password hashing,
and revocation of existing sessions after a successful reset. Application code
must never create or persist a parallel reset token.

The delivery boundary supports two explicit modes through
`PASSWORD_RESET_DELIVERY_MODE`:

- `LIGHT_DEV` downloads a request-scoped text file containing the Better Auth
  reset URL. It exists only for local testing, keeps no token in application
  storage, and must throw if enabled while `NODE_ENV=production`.
- `PROD` delegates the Better Auth URL to the production transactional-email
  adapter. That adapter is intentionally unconfigured until an email provider is
  selected; selecting a provider must not alter the recovery screens or token
  lifecycle.

When the environment variable is omitted, non-production environments default
to `LIGHT_DEV` and production defaults to `PROD`. Recovery responses remain
generic so the public UI does not confirm whether an email address is registered.

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

### 3.6 Operational Error Reference

Complex operational failures across the entire application use stable
feature-prefixed codes such as `WP-006` or `VRS-002`. Sonner displays a concise
user-safe message and the code, while the ADMIN-only `/admin/error-reference`
page provides searchable explanations, common causes, examples, and
troubleshooting steps. Its permanent navigation entry belongs on the future
admin front page rather than inside any individual feature screen.

The structured catalogue in `lib/errors/error-catalog.ts` is the single source
for both typed action codes and the reference page. Codes identify conditions,
not individual incidents. Routine form validation remains inline and uncoded.
Neither action responses nor reference entries may expose stack traces, raw
database errors, secrets, private user information, or sensitive internal IDs.

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
| `studySections` | Ordered, typed Markdown sections for Book Background, Historical Context, Study Note, Key Lesson, Application, Cross References, Word Study, and Prayer |
| `tags` | Array of category tags, e.g., `["love", "salvation"]` |
| `isActive` | Whether the verse is published and available |
| `createdBy` | Admin user ID |
| `updatedAt` | Audit timestamp |
| `translations` | Related `VerseTranslation` records |

The structured canonical book name is **Psalms**. Human-readable references use
the conventional singular form, such as **Psalm 23:1**. Tags have
case-insensitive identity and use one canonical human-readable Title Case label
throughout forms, filters, and verse displays.

`reflection` and `tags` retain their own structured fields and are not embedded
inside study-section Markdown. The legacy `studyNote` database column is retained
temporarily for rollback safety, but new application reads and writes use the
typed `VerseStudySection` records.

For the checked-in curriculum, Excel tags form the base set and audited study
guide tags are merged into that set case-insensitively. This preserves broader
workbook categories while adding the guide's more specific discovery terms.
After generation, `Tag` and `VerseTag` are the only tag source used by the
application; study-section Markdown does not retain a duplicate Tags block.

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

The administrative verse library can display Reference, Book, Tags,
Translations, Status, Waypoints, and Packs. Administrators choose the visible
columns from a checklist, with no more than five information columns shown at
once. Row actions remain available independently of that limit.

### 6.3 Administrative CSV Import

Administrators can populate the verse library in batches of up to 100 rows using
the downloadable CSV template. The import requires canonical location fields and
KJV as the minimum playable translation. WEB, BSB, NIV, ESV, reflection, tags,
and all eight structured study sections may be left blank and completed later.
A blank `isActive` cell safely creates an inactive draft. The import applies the
same validation and normalization as manual creation and displays a row-by-row
preview before confirmation. Existing
references and repeated references within the file are skipped and reported;
bulk import never overwrites an existing verse. Accepted rows and the associated
admin audit record are written in one database transaction.

References are never authored directly in either the form or CSV file. They are
generated from book, chapter, starting verse, and optional ending verse after
validation against the exact NIV/KJV-compatible verse limits shared by every
translation. The compact structure dataset contains counts only and no
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

An administrator may delete only the final waypoint, and only while it remains
hidden, unassigned, and free of learner-linked progress, day progress, and game
sessions. This narrowly removes an accidental unused append without renumbering
curriculum history. No other waypoint deletion is permitted.

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
A hidden waypoint with no history remains freely editable and may be returned
to an unassigned placeholder; unassignment resets its provisional Journey Stage
to `LEARN` until an administrator makes a new explicit assignment. A published but
unstarted waypoint must be hidden before its verse or Journey Stage can change.
Once any waypoint progress, day progress, or waypoint-linked game session exists,
the waypoint cannot be reassigned, hidden, or reordered. Its verse content also
becomes immutable so a learner's historical challenge cannot silently change.
Published waypoint dependencies prevent verse archival. No routine administrator
override exists in the initial system; any future exceptional correction workflow
requires a separately approved, reason-bearing, fully audited design.

### 7.3 Waypoint Progression Rules

- The lowest-numbered currently published waypoint backed by a published verse
  is the only waypoint unlocked for a new user. In a normally configured
  curriculum this is Waypoint 1.
- All other waypoints are locked until the previous waypoint is fully completed.
- A waypoint is fully completed when all three days of its challenge are complete.
- Completing a waypoint's Day 3 automatically unlocks the next currently
  published waypoint returned by the database; numbering gaps are not treated
  as learner failures.
- A completed waypoint displays **three flames** on the map.
- A partially completed waypoint displays one or two flames depending on days completed.

Progress records are created lazily. The application stores only waypoints and
days the learner has actually unlocked or started; it does not pre-create locked
rows for the rest of the expanding curriculum. First-waypoint initialization is
idempotently attempted after registration and login, and game entry may safely
retry it if an earlier database operation was interrupted.

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
| **Recall** | 🧠 | Revisit the verse after several waypoints to test memory retention. | Yes | 5 minutes per mode attempt |
| **Strengthen** | 💪 | Verse returns with increased difficulty and reduced support. | No | 3 minutes per mode attempt |
| **Master** | 👑 | Final challenge for this verse. Maximum difficulty, no assistance. | No | 2 minutes per mode attempt |

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
| Time limit per mode attempt | ❌ | ✅ 5 minutes | ✅ 3 minutes | ✅ 2 minutes |

These rules apply regardless of which of the five game modes is being played. If the Journey Stage disables hints, all modes within that waypoint have hints disabled.

Time limits apply independently to each mode attempt, not to the complete
five-mode day. A timed attempt begins from its server-persisted `startedAt`, and
the server rejects completion after its deadline even if a client timer was
paused or altered. An expired attempt awards nothing and unlocks nothing; the
learner may immediately create a new attempt for the same mode. Earlier completed
modes remain complete. Leaving the page, backgrounding the browser, refreshing,
or changing the device clock does not pause or extend an attempt.

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

Starting a day requires an unlocked learner-waypoint record, the preceding day
where applicable, and a currently published waypoint and verse. Completing a
day requires a server-created `IN_PROGRESS` day record. Day 3 completion,
waypoint completion, and the next available waypoint unlock commit in one
transaction so a partial advancement state cannot be observed.

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
- A prominent Exit control returns the learner to the current waypoint's Day
  Selection screen without claiming completion.
- Every game route and mode must honor the saved Light, Dark, or System theme.
  Shared gameplay surfaces use semantic theme colors with intentional
  light/dark accents; a mode must never force the complete experience into one
  color scheme.
- The shared public theme switcher persists its selection to `UserSettings`
  whenever the visitor is authenticated. Anonymous visitors retain a
  browser-only choice. Protected layouts and public controls must never maintain
  competing theme values that cause navigation to restore an older appearance.
- After a successful mode submission, show an animated completion interstitial
  with a deliberate Continue action; do not advance the visible mode
  automatically.
- Administrators may launch a clearly labeled Test Replay of an already
  completed mode. Test Replay is non-progressing and must never create attempts,
  rewards, cooldowns, streak changes, badge events, or completion writes.

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
- On all correct: confetti fires, one sound is randomly selected from the
  extensible victory pool, and an animated completion interstitial presents the
  Continue button. The initial pool contains a triumphant chord, bright fanfare,
  and crowd-cheer-style celebration, with immediate repetition avoided.

**Audio cues:** Pick (on drag start), drop (on placement), an audible negative
cue on failed Check, and a randomized victory-pool sound on full success.

**Reusable components required:**
- `word-bank.tsx`
- `blank-slot.tsx`
- `draggable-word.tsx`
- `placed-word.tsx`

---

### 10.3 Game Mode 2 — Puzzle

**Concept:** Instead of individual words, the verse is broken into balanced
phrase chunks of normally 2–4 words. Users arrange the phrase chunks in correct
order.

**Interaction:**
- Same drag/tap mechanics as Drag & Drop but operating on phrase tiles instead of single words.
- The verse remains one flowing sentence: visible phrases and inline phrase
  blanks share the same verse area and wrap naturally across screen sizes.
- Phrase bank shows shuffled phrase chunks.
- Difficulty scaling retains the standard percentage ranges, with useful
  minimums: Glimmer removes at least two phrases, Glow at least three, and
  Radiance removes all available phrases. Counts clamp to the number of phrases
  when a very short verse cannot supply the desired minimum.
- Four- and five-word verses produce two balanced chunks. Verses of six or more
  words target at least three chunks. The generator avoids one-word fragments
  whenever the verse length permits.
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
- Each blank shows the first letter as a light-grey placeholder cue (e.g.,
  "L_____" for "Lord").
- The cue is not pre-filled input: the learner types the complete word,
  including its first letter.
- Input is clamped to the exact normalized word length, including for pasted
  text; canonical punctuation remains outside the field and is not typed.
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

**Note:** Fill Mode is the final mode of each day. Its successful completion
triggers the server-owned day transition, which sets the next-day cooldown and
— on Day 3 — marks the waypoint complete and unlocks the next currently
published waypoint atomically. Glow Point awards, streak updates, and badge
evaluation are added by their dedicated roadmap phases and must not be claimed
by the UI before those systems are implemented.

After Radiance, the normal day-reward completion screen is followed by a
separate learner-controlled **Waypoint Complete** milestone. It shows three
kindled flames, the completed waypoint and verse, the next unlocked waypoint or
caught-up state, the persisted Glow Points earned across that waypoint, and the
learner's total balance. It plays the waypoint fanfare and returns to the
refreshed trail map. Glimmer and Glow do not show this second milestone.
After the screen enters, the three flames pop in sequentially with lightweight
particles and synchronized sound. Each uses a transparent two-layer vector fire
whose outer silhouette flickers faster than its calmer inner flame, with small
embers occasionally escaping upward. Reduced-motion users receive the same crisp
vector flame without continuous movement. The Waypoint Rewards card then drops
into place, followed by the Total Balance card. Reduced-motion preferences render
the same information immediately without staged movement or particles.
After the Total Balance card settles, its number starts at the waypoint reward
total, counts to the learner's persisted overall balance, and briefly enlarges
before returning to its normal size. Reduced-motion mode shows the final value
immediately without counting or pulsing.

---

## 11. The Hint System

The Hint System is a separate gameplay assistance mechanism that is independent of Cue Mode. Hints reveal the full verse text for reference during gameplay.

### 11.1 Hint Rules

- Each user receives a free hint allowance (default configurable by Super Admin).
- Users may purchase additional hints from the Oil Shop using Glow Points.
- Until the Oil Shop phase defines explicit hint-pack quantities, the balance
  consists only of the configured free allowance. Generic purchases must never
  be guessed to represent hint credits.
- **Hints are only available during the Learn and Recall Journey Stages.**
- Hints are completely disabled during the Strengthen and Master Journey Stages, regardless of the game mode being played.
- Using a hint is recorded in `HintUsage`.
- Hint usage may optionally reduce Glow Points earned for the session (configurable).

### 11.2 Hint Interaction

- A Hint button is visible in the game shell when hints are available for the current Journey Stage.
- Clicking the Hint button opens a modal showing the full verse text.
- The modal remains visible for six seconds, shows a top progress bar filling
  across that interval, and then closes automatically. It may still be closed
  manually. Reduced-motion users receive a static progress state and duration
  notice instead of the filling animation.
- A Sonner toast fires confirming "Hint used. X hints remaining."
- The Hint button becomes disabled and shows a count of zero when no hints remain.
- When the Journey Stage is Strengthen or Master, the Hint button is not rendered at all.
- Administrators consume real hints during normal campaign gameplay. During
  Admin Test Replay, an unlimited **Test hint** uses the same modal without
  creating `HintUsage`, reducing balance, or changing profile statistics.

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
- The authenticated shell detects the browser's IANA timezone on first use.
  Learners may explicitly change it in Settings, and later devices must not
  silently overwrite the stored selection.
- The first server-verified mode completion on a local calendar day updates the
  streak. Further mode completions that day do not increment it again.
- Missing a full calendar day resets the streak to zero.
- The user's current streak and all-time best streak are stored separately.
- Streaks are displayed on the game home screen, the user profile, and the leaderboard.
- After the standard mode-completion screen, a separate learner-controlled
  streak celebration appears only when that completion starts, increments, or
  resets the learner's local-day streak. It includes native sharing with a
  clipboard fallback. Same-day completions and Admin Test Replay do not show it.
- Streak presentation uses named levels: Spark (1–2), Kindling (3–6), Steady
  Flame (7–13), Beacon (14–29), Blaze (30–59), Inferno (60–99), Supernova
  (100–364), and Eternal Light (365+). Entering a new level receives a stronger
  flame surge, expanding ember rings, medallion entrance, and glow emphasis.
- The streak celebration includes a timezone-derived forward seven-day strip
  beginning today. It shows the potential streak count for each day, marks the
  exact next-level day when it falls in view, and always states the remaining
  days and projected local date. Forecast wording is conditional on maintaining
  the streak and never claims future progress.
- A quiet synthesized burning-flame ambience plays only while this screen is
  visible, respects the persisted audio preference, and stops on dismissal. A
  success cue plays first; the flame ambience fades in only after that opening
  cue finishes.
- A reset celebration preserves and displays the previous best instead of
  claiming a new personal best. One-time Glow Point milestone rewards remain
  owned by the Badge System and must not be awarded directly by streak display.

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

Badge unlocks award Glow Points by rarity:

| Rarity | Glow Points |
|---|---:|
| Common | 50 |
| Uncommon | 100 |
| Rare | 200 |
| Epic | 350 |
| Legendary | 500 |

These values are server-owned catalogue data. A client never supplies either
the rarity reward or the balance change.

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
- Delete a badge only while no player has unlocked it. Any partial progress is
  removed atomically with the badge and the deletion is audited.

Creation and editing use a controlled criterion catalogue rather than
administrator-authored executable rules. Criteria with a currently implemented
trusted server metric may be activated. Definitions for future Vault,
Fellowship, Leaderboard, or other unavailable events remain paused until their
owning feature is implemented. Pausing a badge prevents new progress and
unlocks; players who already earned it retain the badge and its Glow Points
permanently.

Super Admin additional capabilities:
- Award a badge manually to a specific user (emergency use only, logged in audit trail)

Badge progress is always calculated automatically by the badge engine. Admins should never directly edit a player's progress value.

---

## 15. Feature Pages and Navigation

### 15.0 Game Experience Direction

Scripture Memo is a game, not a conventional web application with game features
attached. Every player-facing screen, page, transition, and interaction must
reinforce that identity through immersive composition, tactile controls, strong
progress feedback, responsive motion, purposeful audio, and satisfying
celebration. Generic dashboard cards, plain form flows, and default component
library styling are foundations only—not finished player experiences.

The visual treatment should remain calm, devotional, readable, accessible, and
mobile-first while still feeling polished and alive. Desktop layouts expand the
same game world rather than converting it into a SaaS dashboard. Administrative
surfaces may prioritize operational clarity, but should remain visually
consistent with the product and provide previews for player-facing experiences.

Buttons and equivalent tactile controls must communicate physical response:
hover-capable devices receive a subtle lift and stronger depth, while pointer
and touch activation visibly press the control toward the surface. Disabled
controls remain still, keyboard focus remains explicit, and reduced-motion
preferences remove transform-based feedback without weakening usability.

### 15.1 Game Home

The landing page after login. Shows:
- User's current Glow Points and streak
- Current active waypoint and its Journey Stage
- Quick-access button to resume gameplay
- Navigation to all main sections

### 15.2 Game Map (🗺️)

Mobile-first winding campaign trail of all current waypoints. The presentation
uses original code-native scenery and tactile circular nodes rather than a
dashboard grid, while keeping progress readable in light and dark themes.

During pre-launch comparative testing, the map exposes two interchangeable
presentations over the same progress data and gameplay navigation:

- **Map A — Trail:** the mobile-first winding campaign trail.
- **Map B — Grid:** the original responsive ten-card map.

The tester may switch freely, the browser remembers the preference locally, and
`?variant=a` or `?variant=b` creates a deterministic tester link. This preference
does not affect progression and is not durable application data. Map A keeps its
minimal waypoint-and-flames presentation; Map B intentionally restores the
original Scripture reference and Journey Stage preview for comparison.

- Waypoints rendered in scrollable groups of 10—not the entire expanding
  curriculum at once.
- Map A shows each waypoint's number, status treatment, flame count, and an
  honest three-segment ring representing the three challenge days. Map B also
  previews the Scripture reference and Journey Stage. Day Selection remains the
  authoritative full-detail screen for both variants.
- Map A includes a full-height right-side Trail Navigator on mobile and larger
  screens. It lists every published five-waypoint trail as `Trail N`, shows its
  artwork, waypoint range, completion progress, and current/locked/completed
  state, and jumps to unlocked trails without changing progression. Locked
  trails remain visible but cannot be selected.
- Map A keeps two icon-only controls near the bottom-right viewport edge: one
  opens the Trail Navigator and one returns directly to the current trail.
- Nodes alternate along an original connected trail, with the current waypoint
  receiving a prominent continue treatment. Decorative progress never implies
  completion that is absent from persisted learner state.
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

Reflection space shown after completing Radiance or as a standalone destination.
- The same Sanctuary opens before Glimmer for an unlocked waypoint, locks from
  the first Glimmer session through Radiance, and permanently reopens after
  Radiance. The lock is server-enforced across direct URLs, Vault actions, and
  waypoint navigation; active-practice screens never serialize the verse text.
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

Vault replay uses Radiance-level content across all five ordered modes. It is
untimed and hints are unavailable. Every answer and mode transition is validated
by the server, but replay sessions never change campaign progression, streaks,
cooldowns, waypoint history, or Glow Points. Completing all five modes records
one Vault replay and evaluates the Vault Explorer badge from that trusted total.

### 15.6 Oil Shop (🛢️)

Marketplace for spending Glow Points.
- Current Glow Points balance displayed prominently at top
- The MVP catalogue begins with consumable hint packs: 1 hint for 50 Glow
  Points, 3 hints for 125, and 5 hints for 200. Profile themes, map cosmetics,
  flame styles, and other visual inventory remain deferred.
- Grid of available shop items, beginning with extra hints
- Clicking an item opens a preview modal with description and cost
- Purchase button deducts Glow Points via a server-side transaction
- On success: Sonner toast "Purchased [item name]!" and balance updates
- On insufficient Glow Points: error Sonner toast
- Purchased hint quantities are snapshotted on each purchase and extend the
  same server-authoritative allowance used by gameplay, the Vault, and the shop.
- A purchase deducts Glow Points, records the immutable negative reward-ledger
  row, and grants its hint entitlement in one locked database transaction.

### 15.7 Fellowships (👥)

Social group system.
- View fellowships the user belongs to
- Browse/search public and private fellowships. Private results disclose only
  their public identity and clearly require leader approval.
- Create a fellowship (name, description, public/private setting)
- Select one of twelve curated fellowship insignias; uploaded insignias are not
  supported, and the server accepts only fixed catalogue keys.
- Fellowship leaders can later edit the name, description, discovery status,
  and insignia. The stable fellowship URL does not change when its name changes.
- Invite secrets are not permanently exposed in the Fellowship header. The
  leader opens a responsive Invite panel to share or copy the prefilled joining
  link/code. Code rotation belongs in leader settings when an older invitation
  should expire, not in the everyday sharing panel.
- View fellowship members and their progress
- Fellowship-specific leaderboard
- Public fellowships join immediately from the directory or a shared code.
- Private directory and shared-code access create an individual pending request;
  membership is created only after the fellowship leader approves it.
- Learners can cancel their pending request. Leaders can approve or reject each
  identified applicant and review resolved request history without receiving
  private email addresses or raw account identifiers.
- Shared invitations use a public `/join/[inviteCode]` landing page. Opening the
  page never mutates membership: authenticated players explicitly join or
  request access and may decline, while
  signed-out and new players resume the same invitation after Better Auth login,
  registration, and required translation onboarding.
- A share URL/code identifies the invitation source, not a recipient. A person
  appears in fellowship management only after submitting a private join request.
- Rotated, malformed, or unknown invitation codes show a recoverable expired
  state and disclose no private membership data.
- Leave a fellowship
- Fellowship creators remain leaders and cannot leave until leadership is
  transferred; leadership transfer and dissolution are deferred moderation work.
- Creation is limited to three fellowships per account per rolling 24 hours to
  reduce spam at the server boundary.

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

#### Great Beacon league refinement

- **Beacon XP** is permanent, non-spendable progression and fills an escalating
  Beacon Level bar. Weekly Beacon XP records eligible XP inside one global
  Monday 00:00 UTC competition week.
- Game modes award 10 XP. Glimmer, Glow, and Radiance completion add 25, 40,
  and 60 XP; waypoint completion adds another 100 XP. Failed attempts, admin
  tests, Vault review, and replays award no XP.
- Leagues are Traveler, Disciple, Messenger, Watchman, Teacher, Shepherd,
  Elder, Scribe, and Saint. Cohorts hold up to 30 players; top 7 promote and
  bottom 5 demote when at least 10 players competed.
- Saint never promotes. Ranks 1, 2, and 3 earn 5, 3, and 2 lifetime Crowns;
  ranks 4 through 10 earn one. Crowns cannot be spent.
- My League shows the weekly cohort. Country and Fellowship are recognition
  rankings by Weekly Beacon XP. All Time uses permanent Beacon Level and XP.
- Nine independent league emblems identify Traveler through Saint. Players can
  open the League Journey from My League to see every reached and future tier.

### 15.9 Settings

User settings:
- Display name
- Country (used for country leaderboard)
- Preferred Bible translation (NIV / ESV / KJV)
- Preferred interface language (English / Spanish / French initially; independently
  expandable without changing the player's Bible translation)
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

### 17.0 Environment Isolation and Operational Efficiency

- Routine local development uses Prisma Postgres Local through `prisma dev` (or
  another explicitly approved local PostgreSQL instance), never the hosted
  production database.
- Automated tests use their own test database and must not consume production
  operations or mutate development data.
- Production credentials are supplied only through the deployment environment;
  they are not copied into the tracked local template.
- Read paths must remain read-only. Lazy progression initialization occurs only
  when a cheap read proves that learner state is genuinely missing.
- Request-scoped session and settings reads are deduplicated, presentation
  preferences use safe local state where appropriate, and recurring presence or
  leaderboard refreshes remain visibility-aware and deliberately infrequent.
- New features must consider query count, polling frequency, N+1 behavior, and
  hosted database cost as part of design and review without compromising
  security, correctness, or transactional integrity.

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

### 18.1 Player Portraits and Partner Frames

- Players choose from twelve bundled animal portraits. User uploads and remote
  avatar URLs are not accepted.
- Profiles persist stable catalog keys rather than asset paths. Unknown legacy
  keys fall back to the lion portrait and standard frame.
- Every player receives the standard frame. A persisted Partner entitlement is
  required to select gold, violet crystal, emerald, silver, flame, or celestial
  frames. The donation/subscription system will grant that entitlement later.
- Partner eligibility is verified on the server when settings are saved; hiding
  premium frames in the browser is not an authorization boundary.
- The same composed portrait and frame appear in profile settings and every
  leaderboard scope.
- Leaderboard portraits show country through packaged SVG flags without
  repeating its country code or depending on operating-system emoji support. A
  green dot means the real account reported protected-route activity in
  the previous five minutes; exact last-seen timestamps are never exposed.
- League and Country views may be filled with viewer-specific Trail Rivals.
  Rivals use deterministic weekly schedules with idle days and discrete scoring
  sessions. Every displayed row receives an easy-to-read table position, while
  a compass beside a rival's name explains that its position is presentational
  and never affects official promotion, demotion, rewards, Crowns, or progression.
- Leaderboard rows show only the scope-relevant Beacon Points. Selecting a row
  opens a compact detail dialog for the player's secondary Beacon statistics.
- The leaderboard list has Rank, Player, and Beacon Points headers. Displayed
  positions one through three receive custom crown marks and metallic gold,
  silver, and bronze rank plates; the signed-in learner receives a violet row
  and rank treatment so their position is immediately recognizable.
- At the 375px foundation width, compact rank plates, portraits, gaps, and score
  pills reserve most flexible width for the player's name. Comfortable row
  padding provides breathing room without enlarging fixed controls.
- Trail Rivals never appear in Fellowship or All Time views and are not stored as
  users, profiles, progression records, or presence records.

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
- `updateFellowshipAction` (leader only)
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

Implementation details for these requirements are consolidated in
`docs/UI-UX-GUIDE.md`. Agents and developers must read that guide before
changing player-facing UI; `/ui-foundation` remains the living visual reference.

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

- Player-accessible map replay for completed challenge days. A player may choose
  any individually completed mode from a completed Glimmer, Glow, or Radiance
  card. These practice sessions are explicitly non-progressing and reward-free
  by default; they never alter attempts, cooldowns, streaks, campaign progress,
  or waypoint history. Vault replay remains available as the organized
  long-term mastery library. Revisit any limited daily practice reward only as
  a separate, abuse-resistant product decision.
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
