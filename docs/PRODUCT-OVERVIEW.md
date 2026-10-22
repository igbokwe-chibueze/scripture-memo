# Scripture Memo — Production Technical Document
**Version:** 2.0  
**Purpose:** This document is the single source of truth for the Scripture Memo application. It covers product design, gameplay mechanics, progression systems, data models, architecture rules, UI/UX expectations, and implementation standards. Every AI agent and developer must read this document in full before writing any code.

---

## 1. Product Summary

Scripture Memo is a full-stack, interactive scripture memorization web
application. It guides users through a structured learning journey using an
expanding **Waypoint System** bootstrapped with 400 sequential records. Each
waypoint represents one scripture memory unit—normally one verse or verse range.

The platform is built on four scientifically grounded memorization principles:

1. **Spaced Repetition** — 12-hour rolling cooldowns between challenge days provide a deliberate practice gap.
2. **Progressive Difficulty** — five game modes and three difficulty levels per waypoint prevent plateau.
3. **Multi-Sensory Learning** — five interaction modalities (drag, arrange, swap, cue, type) engage different learning styles.
4. **Immediate Feedback** — color-coded results, audio cues, and animations reinforce correct recall.

The application combines two layered progression systems that work together:

- **The Three-Stage Challenge System** — how a user completes a single waypoint (Glimmer → Glow → Radiance).
- **The Journey Stage System** — how a verse progresses across multiple waypoints over the expanding journey (Learn → Recall → Strengthen → Master).

These two systems are independent but complementary. A user always plays the full three-stage challenge at each waypoint. The Journey Stage tells them which appearance of that verse they are currently working on.

---

## 2. Required Technology Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16.3.6 with App Router |
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
  adapter, which sends through the shared Resend provider. It uses
  `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, the same credentials as verification
  email; Better Auth's recovery screens and token lifecycle are unchanged.

When the environment variable is omitted, non-production environments default
to `LIGHT_DEV` and production defaults to `PROD`. Recovery responses remain
generic so the public UI does not confirm whether an email address is registered.

### 2.2 Email verification and account activation

Better Auth owns email-verification token generation, one-hour expiry,
validation, and the `emailVerified` state. Email/password registration creates
the account and reports that verification is pending without opening a game
session. Each newly sent link replaces the previously issued link: only the
latest unexpired link can verify the account, and a link can be used only once.
A valid-credential sign-in attempt for an unverified account sends a fresh link
and remains blocked until that link is used. Verification returns the player to
login; successful login then performs the normal idempotent player foundation
and first-waypoint setup.

Email delivery uses `AUTH_EMAIL_DELIVERY_MODE`:

- `LIGHT_DEV` captures the Better Auth link in the current Server Action and
  downloads it for local manual testing. It is rejected in production and does
  not store verification tokens in application tables or browser storage.
- `RESEND` sends the Better Auth link through Resend. Production defaults to
  this mode and requires `RESEND_API_KEY` plus `RESEND_FROM_EMAIL` from a sender
  domain verified in Resend.

Password reset and email verification use the same Resend sender and
domain-scoped sending key. The owner reports that `mail.scripturememo.com` is
verified in Resend and its DNS is managed by Namecheap. A development API key
has been configured locally, and the owner confirms Resend sent a real
verification email. Production requires its own key and deployment secrets.

To enforce latest-link-only behavior without changing the Prisma schema or
creating a second token system, the application stores a keyed digest of the
current Better Auth token in the existing `Verification` table. Sending a new
link replaces its prior record; successful verification consumes the current
record. Raw verification tokens are never persisted by this layer. Better Auth
still validates token signatures and expiration.

At rollout, the one-time
`20260926100000_grandfather_existing_email_accounts` migration verifies
pre-rollout accounts created before 2026-09-27 00:00 UTC so existing local test
users are not locked out. Accounts created after that cutoff remain subject to
verification. The hosted production database is not used for development; the
previously selected hosted database remains the production target, with its
pre-launch contents refreshed from the approved local release snapshot under
the documented production cutover procedure.

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
- Complete the three-stage challenge for each waypoint.
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

For gameplay, punctuation between separate words must be treated as a word
boundary during tokenization and answer normalization. Em dashes remain visible
with the verse text but do not join the words on either side.

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

If a verse does not have the user's preferred translation, the system falls
back to the default platform translation. The current default is KJV; Super
Admins may choose among KJV, WEB, and BSB, the translations currently offered
to learners. NIV and ESV remain schema values for future licensed content.

---

## 7. The Waypoint System

### 7.1 What Is a Waypoint?

A waypoint is a sequential learning checkpoint in the user's journey. The
bootstrap curriculum contains **400 waypoints**, but 400 is not a permanent
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

The approved seed currently creates 400 permanently numbered waypoint
assignments across 100 verses. New waypoints are appended as hidden,
unassigned drafts. Because the database requires a Journey Stage before a verse
is assigned, new drafts use `LEARN` provisionally. That value has no gameplay
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
- A waypoint is fully completed when all three challenge stages of its challenge are complete.
- Completing a waypoint's Stage 3 automatically unlocks the next currently
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
| `IN_PROGRESS` | At least Stage 1 started but Stage 3 not yet complete |
| `COOLDOWN` | Awaiting 12-hour cooldown before next day unlocks |
| `COMPLETED` | All three challenge stages complete |

---

## 8. The Journey Stage System

The Journey Stage System is a macro-level progression layer that tracks each
verse's repeated appearances across the expanding waypoint journey. It is
separate from and independent of the Three-Stage Challenge System.

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

At each of these waypoints, the user still completes the full Three-Stage Challenge (Glimmer → Glow → Radiance). The Journey Stage affects the availability of hints and the presence of a time limit — not the challenge structure itself.

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

### 8.4A Administrator Journey Stage Testing

The waypoint administration page includes an isolated Journey Stage test
launcher. An Admin or Super Admin may select any assigned waypoint and one of
the five game modes. The launcher creates a server-owned test session using the
waypoint's real verse, translation, Journey Stage, timer, answer validation, and
hint-availability rules.

Administrator test sessions never create or update learner day/waypoint
progress, cooldowns, flames, Glow Points, Beacon XP, streaks, badges, hint
inventory, or profile hint statistics. They are excluded from learner-history
counts and cannot make an editable waypoint permanent. Every mutation endpoint
rechecks both the session's test marker and the caller's current administrator
role; hiding the launcher in the browser is not treated as authorization.

### 8.5 Verse Mastery

After successfully completing the **Master** stage waypoint for a verse (all three challenge stages complete), that verse is considered **permanently mastered** within the main progression. The Vault displays mastered verses in a dedicated section. Players may replay any mastered verse from the Vault at any time without affecting main campaign progression.

---

## 9. The Three-Stage Challenge System

Each waypoint contains three challenge stages: Glimmer, Glow, and Radiance.
Complete them in order, with a rolling 12-hour cooldown between stages.
Completion messages use “Glimmer Complete!”, “Glow Complete!”, and “Radiance
Complete!”. Radiance retains its separate existing waypoint celebration.
Internal `DayLevel`/day-progress names are legacy persistence identifiers, not
calendar-day promises and not the player-facing challenge terminology.

### 9.1 Stage 1 — Glimmer

- Difficulty: Easy
- Words hidden: 20–35%
- Unlock condition: Available immediately when the waypoint is unlocked
- Glow Points reward: Base amount (X)

### 9.2 Stage 2 — Glow

- Difficulty: Medium
- Words hidden: 40–60%
- Unlock condition: Stage 1 complete
- Unlock timing: 12 elapsed hours after Stage 1 completion
- Glow Points reward: 1.5× the Stage 1 base

### 9.3 Stage 3 — Radiance

- Difficulty: Hard
- Words hidden: 70–100%
- Unlock condition: Stage 2 complete
- Unlock timing: 12 elapsed hours after Stage 2 completion
- Glow Points reward: 2× the Stage 1 base
- Completion effect: Waypoint marked complete, next waypoint unlocked

### 9.4 Cooldown Rules

- Cooldowns are enforced **server-side**. Client-side countdowns are display only and cannot be used to bypass the server check.
- Users see a real-time countdown timer on the Day Selection screen when a day is locked in cooldown.
- Regular Admins and Super Admins can bypass cooldowns for testing via a protected override action.
- Player-facing cards remain visually identical for administrators; contextual
  cooldown verification, cooldown override, and completed-day replay controls
  are grouped inside the page's **Admin testing** menu.
- Every cooldown override is recorded in the audit log.

### 9.5 Cooldown Calculation

```
Stage 2 unlock time = Stage 1 completedAt + 12 hours
Stage 3 unlock time = Stage 2 completedAt + 12 hours
```

The server computes whether a day is playable by comparing the current UTC timestamp against the stored unlock timestamp. The client never decides this.

Starting a day requires an unlocked learner-waypoint record, the preceding day
where applicable, and a currently published waypoint and verse. Completing a
day requires a server-created `IN_PROGRESS` day record. Stage 3 completion,
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
- The shared public theme switcher persists its selection in browser local
  storage through next-themes. Protected layouts never restore database themes.
  Appearance is device-specific for both authenticated and anonymous visitors.
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
- Difficulty: Stage 1 — 20–35% swapped; Stage 2 — 40–60%; Stage 3 — 70–100%.
- On all correct: confetti, success toast, Continue button.

**Implementation note:** Swap tracks occurrence IDs for stable interactions, but
correctness and per-slot feedback compare normalized visible words against the
canonical verse slot. Identical repeated words are interchangeable, including
case-equivalent occurrences; hidden IDs never make a correct word incorrect.
Punctuation remains attached to canonical slots. The server independently checks
the reconstructed answer before recording completion or awarding anything.

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
— on Stage 3 — marks the waypoint complete and unlocks the next currently
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
| Stage 1 — Glimmer | Base amount (X, configured by Super Admin) |
| Stage 2 — Glow | 1.5 × base |
| Stage 3 — Radiance | 2 × base |

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

The collection uses Common → Uncommon → Rare → Epic → Legendary groups with
earned/total counts for the current results. Search, Category, and Status
(All/Earned/In progress/Locked) filter the already-loaded authorized collection.
Locked means zero qualifying progress. In progress requires at least one
qualifying achievement below the target; reaching the target earns the badge
through the server reward flow. Evaluation alone does not start a badge, and
no badge prerequisite chain is introduced. Hidden badge identity remains masked
until earned.

Mobile uses two cards per row, with a single-column fallback below 340px.
Desktop uses paired art/text cards and a right-panel Collection summary with
full-collection earned/total progress and rarity totals, independent of filters.
The existing bottom donation card remains. Back to Vault uses the shared raised
navigation control. Existing emoji badge icons remain until replacement artwork
is supplied; the discarded shared button hover-spread experiment is not enabled.
All progress, rewards, and eligibility still come from the existing server read;
search/filter interactions add no queries, writes, or polling.

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
- User's avatar with its saved frame, current Glow Points, streak, and permanent Beacon XP
- Current active waypoint and its Journey Stage
- Three flames reflecting completed days and a button to resume the adventure
- Meemo reading a Bible, following the owner-approved light/dark references
- Fixed-color Bible, Trivia, Fellowship, and Badges shortcuts on the first row
- Shop on the second row, followed by Admin for ADMIN and SUPER_ADMIN users only

The shared player shell uses a desktop sidebar and mobile bottom navigation for
Home, Map, Vault, Leaderboard, and Settings. Shop lives on Home rather than in
either navigation bar. Its top bar includes the real
notification inbox. Shared surfaces follow the selected brand and light/dark
theme; shortcut backgrounds retain blue, purple, coral, and gold, with Shop
reusing blue and Admin reusing purple.
Mobile omits the top-bar divider; tablet and desktop retain it. The supplied
golden diamond artwork represents Glow Points in the top bar and daily reward.
Header Glow balances below 1,000 remain exact. Larger balances truncate down to
one compact decimal with a plus sign (1,275 becomes 1.2K+), never rounding up to
unavailable funds. Tapping or hovering the balance opens its exact localized
amount using the shared popover; the trigger also exposes it to screen readers.
Other header counters retain their existing formatting. No extra query is needed.
Mobile navigation shows icons only, retaining accessible destination labels;
desktop retains text. The Leaderboard artwork is enlarged to compensate for
its transparent padding. Desktop Home scales artwork/cards with viewport height
to keep the main adventure and first shortcut row visible; the second row may
sit below the fold. Desktop alone corrects the stretched Meemo backdrop to a
circle and budgets sidebar/context cards for short viewport heights. The approved
mobile/tablet backdrop and layout are preserved. Admin uses the owner-supplied shield-and-key artwork.

Daily Challenge currently displays explicitly illustrative progress and a +20
reward placeholder; it never grants rewards or modifies learner progress. The
desktop rail also shows a compact theme-aware support card: small heart-holding
Meemo beside a short heading and “Support someone’s journey,” followed by one
Donate button with a subtle periodic shimmer (disabled for reduced motion).
The card stays at the bottom of the right rail; contextual content above scrolls
independently. Shimmer is the shared white/silver opt-in effect, disabled by
default for all primary/secondary buttons and currently enabled only for Donate.
The supporting paragraph, eyebrow, footer and Learn more link are omitted to
keep the invitation below half the rail height. Donate opens `/partner` in a
new tab. `/partner` is an authenticated donation-coming-soon
page with no payment collection. Mobile still omits the rail invitation.
`/bible`, `/game/trivia`, and `/game/daily-challenge` remain authenticated blank
destinations pending their own specifications.
The mascot's public name is Meemo; legacy Luna component and asset identifiers
remain stable to avoid an unrelated internal migration.

### 15.2 Game Map (🗺️)

Mobile-first winding campaign trail of all current waypoints. Map A places
tactile waypoint controls over replaceable trail illustrations, while Map B
keeps its responsive card-grid presentation for comparison.

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
- Map A shows each waypoint's number, status icon, and three progress flames on
  its illustrated button. Map B also previews the Scripture reference and
  Journey Stage. Day Selection remains the authoritative full-detail screen
  for both variants.
- Map A includes a full-height right-side Trail Navigator on mobile and larger
  screens. It lists every published five-waypoint trail as `Trail N`, shows its
  artwork, waypoint range, completion progress, and current/locked/completed
  state, and jumps to unlocked trails without changing progression. Locked
  trails remain visible but cannot be selected.
- Administrators can assign one of the built-in illustrations to each published
  Map A trail from `/admin/map-trails`. Trails without an explicit assignment
  retain the original Coastal → Desert → Temple repeating sequence, so the map
  and navigator stay consistent without writing during learner reads.
- Map A keeps two icon-only controls near the bottom-right viewport edge: one
  opens the Trail Navigator and one returns directly to the current trail.
- Nodes alternate along an original connected trail, with the current waypoint
  receiving a prominent continue treatment. Decorative progress never implies
  completion that is absent from persisted learner state.
- Clicking a locked waypoint shows a Sonner toast explaining how to unlock it.
- Clicking an unlocked or in-progress waypoint navigates to its Day Selection screen.
- Skeleton loaders shown while map data loads.

### 15.3 Day Selection Screen

The owner-approved light/dark concept composition uses a Today's Challenge
header with a generated welcome-Meemo bust, waypoint number, Journey Stage,
verse reference, and Study control. Mobile stacks the illustrated Glimmer,
Glow, and Radiance cards; desktop reorganizes them into three columns within
the unchanged player shell. Supplied emblems and locked artwork live in the
new collection at `public/images/game-ui/waypoints/`, separate from legacy icons.
Surfaces follow the selected brand and light/dark themes.

Study access, recorded rewards, day order, cooldowns, and completed-mode practice
remain server-authoritative. Pre-study scripture is available in a disclosure;
locked Study never renders it. Timed-stage/no-hint notices and administrator
testing remain accessible. Concept sample values never replace live player data.

For a selected waypoint:
- Verse reference and preferred translation displayed
- Journey Stage badge clearly visible
- Stage 1 (Glimmer), Stage 2 (Glow), Stage 3 (Radiance) cards
- Each day card shows: status, reward preview, flame indicator if complete
- For cooldown days: real-time countdown timer (`CountdownTimer` component)
- Start button for days that are ready
- Sonner toast when user tries to click a locked or cooldown day

#### Session preparation and shared header (approved 2026-10-15)

`/game/sessions/[sessionId]` uses the approved light/dark concept for its shared
header and pre-mode introduction. The header shows the reference, Journey Stage,
mode count, colored completed segments without check marks, and Beacon progress with a contrasting
unfilled track and remaining XP to the next level. All values remain server-owned.

Each of the five modes has its own concise instruction and decorative example,
with the generated presenting-Meemo pose. Swap's illustrative “trust” and “Lord”
tiles remain static alongside the directional arrows. The illustration has no
hover, tap, or click effects and is independent of the active verse and answer.

The introduction displays the actual Journey Stage time allowance and available
hint count (or unavailable/test status). Begin retains the existing server action;
no attempt, timer, hint consumption, or reward starts just from viewing the card.
The interactive hint control remains on active gameplay surfaces. Mobile stacks
header and introduction; desktop presents them side by side. Themes remain semantic.

Drag & Drop preparation follows its revised concept: a static gold “Son” tile,
curved arrow, and lower empty destination beside presenting Meemo. Instructions
describe both drag and tap placement; timing, hint count, and Begin use live data.

#### Active game boards (approved 2026-10-15)

Active boards use the corrected concept header: static Meemo artwork over an
oval, centered verse reference and Journey Stage, and the existing menu. The
gameplay-only mascot variant shows both small hands and no blue head marks. Day/
waypoint labels, mode count/segments, and Beacon XP are omitted during active
play. Required server-backed attempt timers remain visible for timed stages.

Drag & Drop and Swap follow the supplied light/dark board concepts. Puzzle,
Cue, and Fill adapt the same compact text-only mode heading, verse surface, and
Reset/Check row. Word and phrase banks wrap without an internal scroll area.
Each mode title has a help button. Detailed Swap/Cue/Fill guidance is available
only inside its help dialog, including feedback colors and automatic input focus
advance. Opening help neither consumes a hint nor pauses a timed attempt.
Swap movable words are gold; selected movable tiles use purple. Focused typing
gaps in Cue and Fill use brand teal, with evaluated success/error colors taking
priority over focus.

Drag & Drop and Puzzle use the same golden-yellow available tiles as Swap for
all players, following the owner's final palette choice. The temporary admin
toggle and browser preference have been removed. Selected tiles remain purple;
receiving gaps, feedback, timers, hints and rewards are unchanged.

Empty Drag & Drop/Puzzle destinations use the original brand-teal readiness
and drag-over highlight, separately from purple selected tiles.
  During an active drag, the hovered empty destination expands by 7% using a
  short transform transition, without reflowing the verse. It returns to normal
  when the drag leaves or ends; filled/disabled gaps do not expand. Saved and OS
  reduced-motion preferences retain the teal cue without expansion.
This owner-approved palette exception is scoped to active gameplay. Other
surfaces and correctness feedback retain the shared theme tokens.

Desktop retains the mobile composition in a wider card. Illustrations remain
static, existing tap/drag/keyboard input and server validation remain intact,
and hints retain their server-authorized balance and Journey Stage restrictions.
Stage completion now follows the approved celebration concept: named stage
heading, celebrating Meemo, verse/Journey Stage, 5/5 mode status, Flame kindled,
Beacon progress, and the stage's actual Glow Points/Beacon XP. It reuses the
approved diamond, flame, and blue-star icons. A level-up notice remains when earned.
The button says Continue if badge/streak/waypoint celebrations remain; otherwise
Exit gameplay. The existing celebration order and destinations are preserved.
Individual mode, badge, streak, and waypoint celebration designs remain unchanged.

The server returns stageEarnedXp after verifying all five ordered modes: the
final award (including stage and Radiance waypoint bonuses) plus the four prior
mode awards. Current totals are 75/90/210 XP for Glimmer/Glow/Radiance. This adds
no database operation and never awards XP a second time. The Glow Points line
uses the stage reward amount, excluding separate badge rewards and account balance.
Reopening a completed campaign session renders this same result card from the
recorded stage reward and that session's XP ledger entries. Two bounded indexed
reads run only for completed campaign sessions; active-session reads are unchanged.
Reopening never awards rewards or replays the badge/streak/waypoint sequence.

### 15.4 Sanctuary (🕊️)

Reflection space shown after completing Radiance or as a standalone destination.
- The same Sanctuary opens before Glimmer for an unlocked waypoint, locks from
  the first Glimmer session through Radiance, and permanently reopens after
  Radiance. The lock is server-enforced across direct URLs, Vault actions, and
  waypoint navigation; active-practice screens never serialize the verse text.
- Full verse starts with the Settings translation; a temporary selector can
  switch among available translations without saving a preference. Reloading
  restores the Settings-derived default. Authorized alternatives reuse the
  existing read; locked responses never serialize them.
- Study and My Notes are tabs on mobile and desktop. Study sections collapse
  individually; only Study note and Prayer start expanded. Other authored
  material, including Reflection when present, remains available collapsed.
- The desktop right rail contains On this page navigation and the existing
  bottom donation card. Navigation opens the selected section and returns to
  Study if My Notes is active. Note drafts survive tab and translation changes.
- Reflection question and study note
- Private notes: user can write and save a personal note about the verse
- Favorite toggle: mark the verse as a favorite
- Calm, devotional UI — no game mechanics visible

### 15.4A Bible reader

- Authenticated `/bible` is a standalone reading space with Home, Read and
  Saved navigation and a Back to game link. It retains the approved fonts,
  semantic light/dark theme and shared tactile controls. Illustrations remain
  labelled placeholders until the owner supplies the approved assets.
- All 66 books are grouped by testament and category, with searchable book
  lists, chapter grids and a book/chapter/verse picker. Topics link to curated
  real passages; the carousel pauses on hover/focus, when hidden or under
  reduced motion, and has an explicit pause control and View all.
- KJV, WEB and BSB come from the Free Use Bible API. Settings selects the initial
  translation; reader changes are temporary. Section headings and footnotes are
  retained when provided. Up to eight session-local chapter tabs, chapter
  stepping, text sizing, reference links and sharing are supported.
- Full-text search is an explicit submit, supports exact references and literal
  phrases, and returns 20 verses per page. Public translation indexes are
  single-flight cached per server worker for 24 hours, at most three editions;
  they contain no private learner data. Chapter/study HTTP responses use a
  24-hour framework cache. There is no polling or routine database initialization.
- Study offers named commentary selection (Matthew Henry, Adam Clarke, John
  Gill, John Calvin, Jamieson-Fausset-Brown, Keil/Delitzsch and Tyndale), OpenBible
  cross-references, and original Hebrew/Aramaic/Greek words through the Berean
  interlinear plus STEPBible brief lexicons. English glosses are labelled as
  interlinear glosses, not guessed word alignments for another translation.
  Missing entries are explained, never invented. Source/licence links and
  attribution accompany text, commentary, references and lexicon definitions.
- Private bookmarks and three highlight colours use the owner-scoped
  `BibleVerseMark` table and are separate from Vault favourites/curriculum
  records. Atomic, idempotent upserts change only the requested annotation;
  the saved library uses 20-row look-ahead pagination and filters. Reading or
  studying never changes campaign progress, rewards, hints, streaks or stats.
- BSB audio offers available narrators, play/pause, seeking, ten-second skips
  and playback speed. Playback starts only on user action and stops on chapter
  or translation change. Matching **KJV/WEB audio is an explicit TODO**, deferred
  by the owner; do not silently play BSB while displaying another edition.

### 15.5 Vault (📖)

The user's complete progress library.
- One searchable verse collection with status and favorites filtering.
- A verse is Completed after its Learn waypoint; Mastered requires all four Journey Stages.
- Translation follows Settings; the Vault has no separate translation selector.
- Favorite hearts and Sanctuary links preserve server-owned study-access locks.
- Packs is an empty state until player packs are introduced; no sample catalogue or progress.
- The compact header retains admin testing; personal stats, replay controls, and waypoint sections are removed from the collection screen.
- Full badge collection (link to `/vault/badges`)
- Desktop retains the context rail and its bottom donation card.

Vault replay uses Radiance-level content across all five ordered modes. It is
untimed and hints are unavailable. Every answer and mode transition is validated
by the server, but replay sessions never change campaign progression, streaks,
cooldowns, waypoint history, or Glow Points. Completing all five modes records
one Vault replay and evaluates the Vault Explorer badge from that trusted total.

### 15.6 Oil Shop (🛢️)

Marketplace for spending Glow Points.
- Current Glow Points balance displayed prominently at top
- The catalogue offers 3 hints for 120 Glow Points, 10 for 300, 25 for 600,
  and 50 for 1,000. Older packs are retired without changing prior purchases
  or their snapshotted hint entitlements.
- The responsive Shop has Hint packs, Avatars and Donations tabs, a welcoming
  Meemo hero, exact Glow balance and two-column item cards. Approved fonts,
  tactile buttons and semantic light/dark theme colors remain unchanged.
- Lion, Dove and Deer remain free in Settings. The other nine existing avatars
  cost 250 Glow Points each, permanently, and are purchased/equipped in Shop.
  Settings displays only the three free options, plus a link to the avatar shop.
  Both Settings and Shop verify paid-avatar ownership on the server.
- At the owner-approved rollout, users equipped with a paid avatar reset to Lion;
  no prior avatar selection grants free ownership. This reset occurs only in the
  migration, never on a read or subsequent catalogue seed.
- Cosmetic ownership is unique per learner/avatar. Repeated/concurrent purchases
  charge once; equipping owned or free avatars never spends points. Avatar
  purchases do not grant hints. Profile themes, map cosmetics and flame styles
  remain deferred, and Partner frame rules remain unchanged.
- Donations remains a coming-soon state with a button opening `/partner` in a
  new tab. Shop remains accessed from Home rather than adding a nav destination.
- The shop read uses five bounded queries per visit (one more inventory read),
  independent of item count, without polling or initialization writes.
- Clicking an item opens a preview modal with description and cost
- Purchase button deducts Glow Points via a server-side transaction
- On success: Sonner toast "Purchased [item name]!" and balance updates
- Hint success receipts highlight the supplied bulb artwork and pack quantity,
  with Previous hints, Purchased and Your hint balance rows. The final total comes
  from the acknowledged server result; the granted quantity is returned from the
  purchase snapshot rather than a potentially stale catalogue preview.
- Avatar success receipts highlight the unlocked portrait and show a representative
  thumbnail stack plus the full usable collection count: three free portraits and
  all purchased portraits, including retired offers. The newly unlocked avatar is
  highlighted in the stack. Equipping remains a separate choice in the Shop.
- Both receipt variants keep the shared audio/reduced-motion preferences, approved
  fonts/theme tokens, a clear close-button column, and explicit dismissal. Hint
  totals count up visually; reduced motion shows the final total immediately.
  Shared UI testing provides separate hint and avatar purchase previews.
- Avatar acknowledgements add one bounded inventory read to refresh the collection
  after cross-device purchases. Hint purchases do not add this read. No polling,
  read-time initialization, or new schema/migration is required for these receipts.
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
- Discovery cards use View to open a details modal with the full description,
  founder and current leader display names, creation date, member count and
  public/private access. Join or Request to join lives inside this modal;
  pending requests can be cancelled there. Existing membership cards still Open.
- Original founder identity is stored separately from the current leader and
  stays unchanged during leadership transfers. Existing fellowships recover the
  founder from the earliest accepted handover, falling back to the current leader
  only when no handover occurred. Deleted founder accounts display Unavailable.
  Discovery never returns email addresses, raw founder/leader IDs or invite codes.
- Create a fellowship (name, description, public/private setting)
- Select one of twelve curated fellowship insignias; uploaded insignias are not
  supported, and the server accepts only fixed catalogue keys.
- Fellowship leaders can later edit the name, description, discovery status,
  and insignia. The stable fellowship URL does not change when its name changes.
- Fellowship detail opens on Overview, followed by Members and leader-only
  Requests (with a pending count). Overview shows About, Group guidelines, an
  access-status card explaining immediate public joining versus private leader
  approval, and the current leader's selected avatar/name.
- Members use their selected avatars/frames and country flags, with You and Leader
  badges. Search and sorting use the already-loaded complete roster locally.
  A separate # column before members shows #1, #2, and so on in displayed order;
  numbering restarts at #1 after searching and follows the selected sort.
  Default order is leader first, then alphabetical; name, date joined and ranking
  sorts support both directions. Ranking uses lifetime Beacon XP descending,
  then completed waypoints and earlier join date for ties. Glow Points do not
  determine this member ranking. The visible label is Lifetime Beacon Points.
- Member rows navigate to `/profiles/[publicId]`. Each profile has an independent,
  stable public UUID; private auth and profile-record IDs are not exposed. The
  authenticated, noindex destination shows the player's approved public profile
  fields. Blocked and unavailable profiles share a neutral not-found state;
  visiting a profile never initializes data or changes friendships.
  Row prefetch is disabled to avoid an authenticated request per visible member.
- Across all fellowship detail tabs, the desktop rail shows Together so far above
  the unchanged bottom donation card: combined lifetime Beacon Points and completed
  waypoints from the full current roster, including progress before joining.
  Searches and sorts do not affect these totals. No extra database read is needed.
- Member cards retain a 12px gap on mobile and desktop so shared hover effects
  have room without overlapping adjacent members.
- A separate optional 140-character introduction appears below the fellowship
  identity. It can be set during creation or in Manage; the existing description
  stays in About. Empty introductions use a localized welcome rather than
  duplicating the About paragraph.
- Leaders edit guidelines in Manage as plain text, one per line (up to 8 lines,
  160 characters each, 1,000 total). Defaults encourage regular Scripture practice,
  celebrating progress without comparison or pressure, and kindness to learners.
  There is no reference to a discussion feature. Clearing the field restores
  localized defaults; existing fellowships need no initialization write.
- Header actions preserve permissions: eligible leaders have Manage and Invite;
  ordinary members can Leave. Leaders still transfer leadership before leaving,
  and closing/suspended fellowships retain their existing governance restrictions.
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
- Fellowship creators remain leaders until they offer leadership to a current
  member and that member accepts. The leader may cancel an unanswered offer;
  former leaders remain members and may leave through the ordinary leave flow.
- A leader may close a Fellowship after password reauthentication and exact-name
  confirmation. It is removed from discovery immediately, pending invitations
  and join requests are disabled, and the leader can cancel closure for seven
  days. Membership and historical records are retained.
- Super Admins have a separate recovery workspace for reasoned, password-
  reauthenticated emergency leadership transfer or immediate closure. Actions
  are audited; emergency closure preserves Fellowship membership and history.
- A completed leadership change notifies every current member. The former and
  new leaders receive role-specific notices; other members are told who now
  leads the Fellowship. For a Super Admin transfer, only the new leader's
  notice includes the administrator's recorded reason.
- Super Admins may also suspend a Fellowship with a reason, exact-name
  confirmation, password reauthentication, and an audit entry. Suspension hides
  it from discovery and blocks new members, invites, edits, closure, and leader
  changes while existing members retain read access. The current leader may
  submit one written appeal within 30 days. A different Super Admin must record
  a reasoned decision to restore or uphold it. An upheld appeal is final; an
  expired appeal does not restore the Fellowship automatically. A Super Admin
  may restore an unappealed suspension with a recorded reason.
- Every transfer, suspension, and closure receives a permanent sequential case
  number. Admins and Super Admins can search the protected case register by
  number or Fellowship name and review the chronological audit history,
  including transfer responses, cancellations, suspension appeals, and closure
  decisions. Each initiating action opens one case; its responses, cancellations,
  appeals, and decisions stay on that case until resolved. A later independent
  transfer, suspension, or closure opens a new case. Only Super Admins can perform governance actions. Existing
  governance records are backfilled; where historic transfer details were not
  retained, the case timeline records only the known status and does not infer a
  missing actor or reason.
- Fellowship notifications open a detail view and are marked read when opened.
  Scheduled or cancelled closure notices link to the Fellowship; a completed
  closure notice links to the Fellowship directory because the closed detail
  route is no longer available. Choosing a notification destination closes the
  notification panel as navigation begins.
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

User settings are organized into three tabs. Game opens by default on navigation:
- **Game:** master audio toggle, separate sound-effects and ambience volumes
  (0–100%, defaults 80%/60%), preview controls, and reduced motion.
- **Profile:** display identity, avatar/frame, country, and journey statistics.
- **App & Learning:** Bible translation, interface language, theme, timezone,
  and journal guides. Translation remains independent of audio settings.

Save routes each preference to its appropriate owner. Profile identity,
avatar/frame, country, Bible translation, and timezone persist in PostgreSQL and
follow the account. Theme, audio on/off, effects/ambience volumes, and reduced
motion live in local storage for this browser. Interface language lives in a
cookie so server rendering uses it without a database lookup. Device-only saves
perform no server mutation or route refresh. Browser-only values never enter an
account repository. Missing/corrupt local values use defaults; blocked storage
shows a save error. Existing browser theme/language survive the transition;
old account-level presentation choices are intentionally discarded.

Gameplay menus link to Game Settings. Sound effects use stronger master gain
with peak compression; ambience has an independent gain. Slider movement and
previews do not persist data; Save applies them. In-game quick mute is temporary.

Each edited field shows a pencil/Unsaved marker until restored or successfully
saved. Undo changes beside Save restores all unsaved tab drafts to the latest
successful save, clears errors/markers, and stops audio previews without writing
data. Both actions lock during a pending save. Failed saves keep drafts intact.

Account saves submit a validated non-empty patch of changed fields only. Only
affected records are written: translation/timezone affect UserSettings, profile
choices affect UserProfile, and display-name changes synchronize User and
UserProfile atomically. Unchanged account fields are not resent or overwritten.
Device saves write only changed local-storage keys; the language cookie and
theme provider update only when their corresponding preference changes.

Editable preferences (storage ownership described above):
- Display name
- Country (used for country leaderboard)
- Preferred Bible translation (KJV / WEB / BSB; KJV is the platform default)
- Preferred interface language (English / Spanish / French initially; independently
  expandable without changing the player's Bible translation)
- Audio on/off, sound-effects volume, and ambience volume
- Reduced motion preference
- Theme preference (light/dark/system)

Admin settings (Super Admin only):
- Default platform translation (KJV by default; currently selectable: KJV, WEB,
  and BSB)
- Base Glow reward (Glimmer = X, Glow = 1.5×, Radiance = 2×). A change applies
  only to future completions; earned ledger entries and balances remain intact.
- Starting hint allowance for new accounts. Existing profiles retain their
  saved allowance when this setting changes.
- Administrator self-cooldown testing bypass (enabled by default; player
  cooldown enforcement is unchanged)
- Read-only, filterable access to immutable audit events. IP addresses and raw
  event metadata are withheld from the browser view.

---

### 15.10 Public Journal and Game Guides (owner-approved 2026-10-14)

- `/blog` is public without login, with submitted text search, category filters,
  bounded 12-article pagination, and an intentional empty state.
- Categories are Game Guides, News & Announcements, and Behind the Scenes.
  `/blog/[slug]` displays published content, its public byline, publication date,
  last updated date, and estimated reading time. Draft URLs show the not-found
  page and noindex metadata without exposing draft content.
- `/admin/blog` and `/admin/blog/[articleId]` are ADMIN/SUPER_ADMIN-only. The
  `new` segment opens an unsaved draft. The Markdown editor supports preview,
  draft saving, publishing, updating, and returning a published article to draft.
- Publication is explicit when saving. Published summaries require at least
  20 characters and bodies at least 80 characters. Bodies are limited to 60,000
  characters; raw HTML, embedded scripts, and remote images are not rendered.
- Slugs are unique and permanent after first publication. Version matching
  prevents stale editors from overwriting newer content. Saves and audit records
  commit atomically. No automatic deletion or article autosave polling occurs.
- The initial local installation includes seven game guides, a welcome
  announcement, and a design article. These are editable database articles,
  not runtime copies of project documentation. Update the relevant guide when
  changing a documented player-facing rule; its last updated date changes on save.
- Landing and Settings link to the public journal; the admin control center links
  to the editor. Existing player navigation remains unchanged.
- Ordinary article reads do not write data or award rewards. Blog publication
  never exposes gated verse-study content or private player/account records.

### 15.11 Player Profiles and Friends (owner-approved 2026-10-19)

- Preserve private account IDs and existing permanent public profile UUIDs.
  `/profiles` opens your own profile; `/profiles/[publicId]` remains stable when
  a display name or username changes. Only signed-in, active players can view
  profiles; pages and invitation entry points are noindex and stay out of sitemaps.
- Display names remain expressive, changeable and non-unique. Players explicitly
  choose a unique username in their own profile: 3-24 ASCII letters, digits or
  underscores, normalized to lowercase. Optional leading @ is accepted in the
  form. Database uniqueness and a format constraint enforce case-insensitive
  ownership. Existing/new profiles keep a null handle until the player chooses;
  no handle is invented and ordinary learning is not gated on this choice.
- A first claim or real change starts a server-enforced 30-day username cooldown.
  Saving the same handle does not restart it. Friendships reference private
  permanent account IDs; browser DTOs and shared URLs expose public UUIDs only.
- Profiles show the selected avatar/frame, display name, handle, optional country,
  join date, Beacon Level, lifetime Beacon XP, completed waypoints, current/best
  streak and earned badges. Email, Glow balance, private notes and friend lists
  are excluded. Earned badge presentation is capped to the 60 most recent entries.
- Profiles use the approved centered portrait layout in both themes, with real
  Beacon progress and a journey summary. Mastered verses require all four Journey
  Stages. Only the owner sees hints-used, friend/fellowship counts, available avatar
  inventory, edit/share controls and the detailed-statistics link.
- Beacon level progress uses the reusable `BeaconLevelBar` component. Current
  and next levels label opposite ends, the bar shows lifetime XP against the
  next cumulative threshold (for example 540 / 750), and the line below gives
  XP remaining to that level. No percentage or repeated top total is displayed.
  Fill measures the current level segment, with an approved minimum visual width
  to keep the XP pill inside at low progress. The remaining-XP line is right-aligned;
  accessible progress values and existing XP thresholds remain exact.
  The same component is used by profile, gameplay introductions, mode completion
  and challenge-stage completion. Reward/level-up feedback remains around it;
  there are no separate gameplay implementations of the level bar.
- Edit profile opens one dialog for display name, username, country and free or
  purchased avatars. All fields save atomically; handle uniqueness/cooldown and
  avatar ownership remain server-enforced. Existing avatar frames are preserved.
  Three recent earned badges appear on the page; View all opens the existing
  bounded earned-badge collection in a dialog for either own or other profiles.
- `/friends` is linked from Home and profiles. The owner's private tabs show
  Friends, incoming Requests, Sent requests and Blocked players. Every tab shows
  its full total when greater than zero, independent of filtering or page. Only the
  Requests count has a red background when greater than zero. Counts sit beside
  tab names. One aggregate supplies the four totals.
  Lists use 20-row pages plus one lookahead row. Explicit list search matches
  name or username within that private list, with literal wildcard escaping.
  Add friends opens an explicitly submitted, paginated player-search dialog.
  Search is explicitly submitted, uses at least two characters, and accepts an
  exact @handle or a handle/display-name prefix. Search never returns the viewer.
- List rows show country, completed waypoints and labelled lifetime Beacon
  Points. Blocked rows retain only identity for unblocking, without progress or
  a profile link. The ellipsis menu reuses the existing consent and confirmation
  controls. A profile-link copy card appears in the desktop rail or below the
  mobile list, with manual-copy fallback; it never creates friendship itself.
- Sending a request never creates an accepted friendship. Only its recipient
  can accept or decline; the sender can cancel. Either friend can remove an
  accepted friendship. Crossing requests still require explicit acceptance.
  Pair uniqueness, database checks and sorted participant transaction locks
  prevent duplicate friendships and resolve concurrent block/accept operations.
- Blocking privately removes the friendship and pending requests, removes old
  social notices between the pair, hides each profile/search result from the
  other and rejects new requests in either direction. It does not change shared
  fellowships. Only the blocker can unblock; unblocking restores no relationship.
  Block and remove-friend controls ask for confirmation before mutation.
- New requests and accepted requests create transactionally consistent inbox
  notices. Newly created outgoing requests are limited to 30 per actor per hour
  with a database-backed counter. Idempotent retries do not consume another
  request or create duplicate notices. No friend activity awards currency or XP.
- One Share profile button uses the existing public UUID URL for both existing
  and new players, without a separate invitation route or welcome page.
  Registration, email verification, login and translation onboarding retain the
  inviter's profile as the validated next destination. No auto-friending occurs.
  Native sharing has a selectable/copyable link fallback when unsupported.
- Reads perform no writes, advisory locks, initialization or polling. A profile
  uses one bounded nested read, one aggregate summary, an owner-only inventory
  read or another-player relationship lookup. A list uses
  an owner-link read, one four-total aggregate and one bounded list. Directory
  search skips unused tab counts and adds one batched relationship
  read instead of per-result lookups. New social links disable speculative
  prefetch to avoid multiplying those reads before a player clicks.

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
| `<DayCard>` | Challenge stage card with name, status, reward preview, and countdown timer |
| `<JourneyStageBadge>` | Pill showing Learn / Recall / Strengthen / Master with stage-appropriate color |

---

## 17. Database Model Plan

Use Prisma with PostgreSQL. This section lists required models. The implementation agent should create a complete schema with all relations, indexes, constraints, timestamps, and enums.

### 17.0 Environment Isolation and Operational Efficiency

- Routine local development uses Prisma Postgres Local through `prisma dev` (or
  another explicitly approved local PostgreSQL instance), never the hosted
  production database.
- For this project, continue using the existing Prisma Postgres Local development
  database. Do not reconnect routine development to the hosted database or
  provision another local development database. The intended production target
  is the same previously provisioned Prisma-hosted PostgreSQL database; do not
  create a replacement production database unless the owner changes this
  decision.
- Before the first production launch, the owner intends to replace that hosted
  database's old contents with a verified snapshot of current local release
  data. Treat this as an explicit one-time cutover: take and verify a backup,
  validate the target and transfer procedure, and exclude local test fixtures,
  development-only accounts, and environment secrets. Setting `DATABASE_URL`
  only changes the connection target; `prisma migrate deploy` updates schema
  state and does not copy records. Once production is live, never overwrite
  production with the development database; production becomes the source of
  truth for live user data.
- Routine automated integration tests use a separate local instance on port
  51224; development stays on 51214. Multi-connection concurrency tests use
  `npm run test:concurrency:local`, which starts an isolated embedded PostgreSQL
  server on a temporary loopback port and removes its data after the run.
  Changing only a Prisma Local database name does not isolate data. Tests must
  not consume hosted operations or mutate development data.
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

- Twelve bundled animal portraits exist: Lion, Dove and Deer are free in Settings;
  the other nine are permanent Shop purchases at 250 Glow Points each. Purchased
  portraits equip in Shop. User uploads and remote avatar URLs are not accepted.
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
- All four leaderboard scopes show official top-three players on a silver,
  gold, and bronze podium (second, first, third). Owner-supplied rank frames
  and empty metallic bases compose with bundled avatars and live names,
  flags, and scope-relevant scores; these frames grant no inventory entitlement.
  Bases fill their columns and provide taller nameplates; names wrap onto two
  centered lines, with full wording available through player details.
  Frames sit on the platform and live text centers on the base's front face.
  Empty podium places keep their frame/base without an avatar, name, flag or score.
  Country without a selected country stays on its tab and links to Settings.
  Fellowship without memberships stays on its tab and links to Fellowships to
  join/create one. Neither empty state falls back to My League or loads rankings.
- Compact rows show official rank, equipped player portrait/frame, country,
  name, Beacon Points and league status where applicable. Trail Rivals retain
  their explanatory compass and never receive official medals or rank numbers.
- Every scope shows the top 30 official players, including the three podium
  places. A learner outside that group appears once after an ellipsis with their
  actual rank; a learner inside it is not duplicated. No pagination, sticky self
  card, Jump to me action or desktop Your Position card is shown. Self rows retain
  teal emphasis, and the shell-owned Become a Partner card remains unchanged.
- Weekly zone charts always show three fixed colored sections: Top 7 / Promote,
  Stay, and Bottom 5 / Demote, even with a sparse cohort. Only the player's rank
  marker moves within its corresponding section. This presentation does not
  change server settlement safeguards. Reset timestamps explicitly use UTC,
  and the initial countdown uses the serialized server snapshot time.
- At 375px, four text tabs, compact rows and truncation preserve usable names
  without horizontal scrolling. Desktop expands the same podium/list composition.
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
- `unlockNextWaypointAction` — triggered after Stage 3 completion
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
changing player-facing UI; `/admin/testing/shared-ui` remains the living visual
reference and is restricted to administrators.

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
| Info | "Stage 2 unlocks in 23h 14m.", "Hint used. 2 hints remaining." |
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
- Expandable game map initialized with the 400 bootstrap waypoints
- Journey Stage display on all relevant screens
- Day Selection screen with cooldown countdown
- All five game modes (Drag & Drop, Puzzle, Swap, Cue, Fill)
- Three-day challenge system with a rolling 12-hour cooldown
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

### Implemented Extensions Beyond the Original MVP

- Player map practice: select an individually completed mode from a completed
  Glimmer, Glow, or Radiance card. Practice is untimed, hint-free, and reward-free;
  it changes no campaign attempts, cooldowns, streaks, or waypoint history.
  Vault replay remains the long-term mastery library.
- Administrative bulk CSV verse import (see §6.3 Administrative CSV Import).
- Fellowship leadership transfer, closure, suspension/appeal, and Super Admin
  governance-case administration.
- Game Home, contextual desktop panels, platform settings/audit viewing,
  and registered brand-theme preview/global selection.

### Defer Post-MVP

- Any daily practice reward requires a separate abuse-resistant product decision.
- Advanced Oil Shop cosmetics (map skins, flame styles)
- Additional Fellowship moderation capabilities beyond the implemented governance workflows
- Push notifications
- Advanced analytics dashboard
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

### Global loading scene (2026-10-18)

- GlobalLoading fills the viewport without scrolling, using the owner's supplied
  portrait Meemo walking image with its original proportions, a single-line heading,
  shared typography, a wider loading bar and visible drifting fireflies in both themes.
  Route-specific loading skeletons remain unchanged.
- Twelve owner-supplied scripture excerpts retain exact English wording regardless
  of translation settings. Each priority passage has weight 2; others weight 1.
  Initial selection is randomized after hydration, with no consecutive repeat.
- Verses rotate after max(8 seconds, 0.3 seconds per word). Hover, keyboard focus
  and hidden document state pause the remaining reading time. The verse region is
  keyboard focusable. No verse references, pause button or extra indicator flame
  are displayed. Navigation never waits for this timer.
- Reduced motion removes verse fades, dot motion and drifting lights. Scripture
  changes are not repeatedly announced by screen readers; loading status is stable.
  All data is bundled locally, with no database reads or polling.

### Private player statistics (2026-10-20)

- `/stats` is available only to the signed-in account and is linked from that
  player's own profile. Other players retain the existing public summary.
- Lifetime sections cover completed modes, activity days, streaks, curriculum
  and verse mastery, books, challenge stages, attempt outcomes and durations,
  translations, Beacon progression/leagues, earned badges, Glow ledger totals,
  hints, owned avatars and connection counts. No new activity tracking is added.
- The activity heatmap counts successfully completed modes, including Vault
  practice and excluding admin testing. Dates use the Settings timezone. It
  defaults to the latest 12 months and supports earlier calendar years.
  Lifetime totals stay independent of the calendar's selected period.
- A compact year overview pairs with a month grid of tappable 44px days and
  learning/practice details. Browsing months or days is entirely local.
- Completion rate excludes unfinished attempts. Recorded attempt time can
  include waiting; missing historical durations remain unavailable rather than
  fabricated. Streaks retain the existing progression rules; practice activity
  on the calendar does not change those rules.
