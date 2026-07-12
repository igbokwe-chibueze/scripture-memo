# AGENTS.md — Scripture Memo

**Version:** 3.0
**Authority:** This repository-root file is the single authoritative instruction
document for every AI agent working in this codebase. Read it completely before
writing code. When any supporting document conflicts with this file, this root
`AGENTS.md` takes precedence. Detailed product requirements remain in `docs/` and
do not replace these implementation rules.

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## 1. Project Identity

**Project name:** Scripture Memo
**Project type:** Full-stack scripture memorization web application

**Primary stack:**

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.10 App Router |
| Language | TypeScript (strict mode) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Better Auth (or equivalent production-ready auth) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Toasts | **Sonner** (not shadcn Toaster — always Sonner) |
| Animations | Framer Motion or lightweight CSS transitions |
| Drag and Drop | @dnd-kit/core |

**What this app does:**
Scripture Memo helps users memorize Bible verses through 220 sequential waypoints. Each waypoint is assigned one verse and a Journey Stage. Users complete a Three-Day Challenge (Glimmer → Glow → Radiance) at every waypoint using five game modes per day (Drag & Drop → Puzzle → Swap → Cue → Fill). The app rewards learning with Glow Points (the only currency), streaks, and a Badge System.

**Before writing any code:** Read `docs/PRODUCT-OVERVIEW.md` for the full product specification.
Read `docs/ROADMAP.md` for implementation order and `docs/SECURITY-AUDIT.md` for
the complete security checklist.
**Before every task:** Re-read the relevant sections of this file.

---

## 1A. Collaboration and Clarification Rules

### 1A.1 Ask Before Acting When Anything Is Unclear

Before executing any task, stop and ask the project owner a clear, focused question whenever any requirement, expected behavior, scope boundary, architectural decision, data rule, user experience, or acceptance criterion is uncertain or can reasonably be interpreted in more than one way.

Do not silently guess, fill in missing requirements, or choose between materially different implementations on the project owner's behalf. Do not begin implementation until the uncertainty has been resolved. When asking, briefly explain what is unclear and why the answer affects the implementation.

Questions are not required when the answer is already explicit in the project documents, the user's current instruction, or the authoritative documentation bundled with the installed dependency. Agents must inspect those sources before concluding that clarification is necessary.

### 1A.1A Verify Current Documentation Before Implementation

Before implementing any framework, library, tool, API, integration, configuration, or procedural workflow, consult its authoritative current documentation whenever the technique, API, convention, or recommendation may have changed. Prefer documentation bundled with the installed package when available; otherwise use the official maintainer documentation. For technical decisions, do not rely on memory, outdated examples, tutorials, or third-party summaries when a primary source is available.

The installed dependency version and its matching documentation take precedence over older project-document examples. When current authoritative guidance conflicts with a project document, stop, explain the conflict to the project owner, obtain approval for the replacement, and update the project document so future work follows the resolved technique.

### 1A.2 Every Script Must Be Extensively Commented

Every script created, proposed, or provided for this project must contain well-detailed and extensive comments. This includes application scripts, command-line utilities, seed scripts, migration helpers, maintenance scripts, automation, configuration scripts with executable behavior, and code snippets intended to be copied and run.

Comments must explain:

- The script's purpose and when it should be used.
- Required inputs, environment variables, dependencies, and assumptions.
- Why each important implementation decision was made.
- The purpose of every exported function and non-obvious logic block.
- Security, data-integrity, transaction, and error-handling considerations.
- Important side effects, expected outputs, and safe failure behavior.

Extensive comments must remain useful: explain intent, constraints, risks, and reasoning instead of merely translating each line of code into prose.

---

## 2. Non-Negotiable Architecture Rules

These rules are not guidelines. Violating them is an architectural failure.

### 2.1 No `src/` Folder

The project uses a **root-based** folder structure. Never create a `src/` directory.

```txt
✅ app/
✅ components/
✅ features/
✅ hooks/
✅ lib/
✅ prisma/
✅ public/
✅ types/

❌ src/app/
❌ src/components/
❌ src/features/
```

### 2.2 Feature-Based Architecture

All application code is organized by **business feature**, not by technical type.

```txt
✅ Correct
features/waypoints/actions/
features/waypoints/components/
features/waypoints/repositories/
features/waypoints/views/

❌ Wrong
actions/waypoints/
components/waypoints/
repositories/waypoints/
```

Only files that are genuinely shared across multiple features belong at root level (`lib/`, `types/`, `components/shared/`).

### 2.3 Thin Route Files — One Line Only

Files inside `app/` are for routing only. They must be one-line re-exports.

```tsx
// ✅ CORRECT — app/(protected)/game/map/page.tsx
export { GameMapView as default } from '@/features/map/views/game-map-view'

// ❌ WRONG — never put anything else in a route file
export default function MapPage() {
  const data = await getMapData()  // VIOLATION
  return <div>{data}</div>          // VIOLATION
}
```

No business logic. No Prisma. No JSX composition. No data fetching. One line.

### 2.4 Repository-Only Prisma Access

Prisma may only be imported and called inside repository files.

```txt
✅ Allowed locations for Prisma:
features/verses/repositories/verse.repository.ts
features/gameplay/repositories/gameplay.repository.ts
lib/prisma.ts  ← the singleton client definition only

❌ Never allowed:
features/verses/actions/create-verse.action.ts
features/gameplay/views/gameplay-view.tsx
components/shared/something.tsx
hooks/use-anything.ts
```

Server Actions must call repositories. They must never call Prisma directly.

The only infrastructure exception is auth-provider initialization in
`lib/auth/auth.ts`: Better Auth's Prisma adapter requires the singleton client
itself. This exception permits adapter configuration only; application queries
and business data access still belong exclusively in feature repositories.

### 2.5 Server Actions Over API Routes

Use Server Actions for all mutations. API routes are permitted only for:
- Auth provider OAuth callbacks
- Third-party webhook receivers
- File upload providers that require a REST endpoint

In all other cases, use Server Actions.

### 2.6 Strict Data Flow

```
View or Component
      ↓
Server Action  ← auth check → role check → Zod validation → repository calls → revalidate
      ↓
Repository     ← the only file that imports and calls prisma
      ↓
Prisma
      ↓
Database
```

This flow is unidirectional. Nothing skips a layer. Nothing goes backwards.

---

## 3. Feature Folder Standard

Each feature uses only the sub-folders it actually needs. Do not create empty folders speculatively.

```txt
features/[feature-name]/
├── actions/       ← Server Actions: auth, validation, orchestration, revalidation
├── components/    ← Feature-specific reusable UI
├── constants/     ← Feature-specific constants
├── data/          ← Static structured data for this feature
├── hooks/         ← Feature-specific React hooks
├── lib/           ← Feature-specific pure helper functions
├── repositories/  ← ALL Prisma/database access — nowhere else
├── schemas/       ← Zod validation schemas
├── types/         ← Feature-specific TypeScript types
└── views/         ← Full-page compositions imported by route files
```

### Folder Responsibilities

**`actions/`**: Server Actions. First thing each action does: validate input. Second: check auth. Third: check role. Then call repositories. Never call Prisma directly.

**`repositories/`**: Database access only. The only place `import { prisma } from '@/lib/prisma'` is allowed (outside `lib/prisma.ts` itself). Every method is a clean, focused database operation.

**`schemas/`**: Zod schemas. One file per action or entity shape. Infer TypeScript types from schemas using `z.infer<typeof schema>`.

**`views/`**: Full page compositions. Imported by one-line route files. Compose components, use hooks, call Server Actions. Do not access the database. Do not import Prisma.

**`components/`**: Feature-specific reusable UI components. If a component starts being used by more than one feature, move it to `components/shared/`.

**`hooks/`**: Feature-specific React hooks. Encapsulate stateful logic, local data fetching, or event handling.

**`lib/`**: Pure helper functions specific to this feature (validators, mappers, calculators). No React. No Prisma. No Server Actions.

---

## 4. Naming Conventions

All file names use **kebab-case**. All suffixes must match the file's responsibility.

| Type | File Name Pattern | Example |
|---|---|---|
| Server Action | `[verb]-[noun].action.ts` | `create-verse.action.ts` |
| Repository | `[noun].repository.ts` | `verse.repository.ts` |
| Zod Schema | `[verb]-[noun].schema.ts` | `create-verse.schema.ts` |
| View | `[noun]-view.tsx` | `game-map-view.tsx` |
| Component | `[noun].tsx` | `waypoint-card.tsx` |
| Hook | `use-[noun].ts` | `use-game-session.ts` |
| Types file | `[noun].types.ts` | `gameplay.types.ts` |
| Context | `[noun]-context.ts` | `game-context.ts` |
| Provider | `[noun]-provider.tsx` | `game-provider.tsx` |
| Constants | `[noun]-[thing].ts` | `difficulty-settings.ts` |
| Utility/helper | `[noun]-[thing].ts` | `answer-validator.ts` |

Use clear, intention-revealing function names:

```ts
✅ createVerseAction
✅ completeGameModeAction
✅ calculateDay2UnlockTime
✅ evaluateBadgeProgress
✅ isDayPlayable

❌ handleStuff
❌ doAction
❌ processData
```

---

## 5. TypeScript Rules

- **Never use `any`**. Use `unknown`, proper generics, `z.infer<>`, or explicitly typed returns.
- Enable `strict: true` in `tsconfig.json` — it must stay enabled.
- All exported functions must have explicit return types.
- Use discriminated unions for complex state.
- Use enums or const maps for fixed value sets.
- Always validate `unknown` external input through Zod before using it.

### Standard Action Response Pattern

Use this type for all Server Action responses:

```ts
// types/api.ts
export type ActionResult<T = undefined> =
  | { success: true; message: string; data?: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> }
```

Usage in a Server Action:

```ts
export async function createVerseAction(input: unknown): Promise<ActionResult<Verse>> {
  // 1. Validate
  const parsed = createVerseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Invalid input.', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // 2. Auth
  const session = await auth()
  if (!session?.user) {
    return { success: false, message: 'Authentication required.' }
  }

  // 3. Role
  if (!isAdmin(session.user.role)) {
    return { success: false, message: 'Insufficient permissions.' }
  }

  // 4. Repository
  const verse = await verseRepository.create(parsed.data)

  // 5. Revalidate
  revalidatePath('/admin/verses')

  return { success: true, message: 'Verse created successfully.', data: verse }
}
```

---

## 6. Validation Rules

Use Zod for every Server Action that accepts input.

```ts
// ✅ CORRECT — validate before everything else
export async function updateVerseAction(input: unknown) {
  const parsed = updateVerseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: 'Invalid input.', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  // Now use parsed.data — it is fully typed and safe
}

// ❌ WRONG — trusting unvalidated input
export async function updateVerseAction(verseId: string, text: string) {
  await verseRepository.update(verseId, { text }) // No validation — VIOLATION
}
```

Do not rely on client-side validation only. The server must always validate independently.

---

## 7. Authentication and Authorization Rules

### Every protected Server Action must:

```ts
// ✅ CORRECT — check auth AND role before any data access
export async function deleteVerseAction(verseId: string): Promise<ActionResult> {
  // Step 1: Check authentication
  const session = await auth()
  if (!session?.user) {
    return { success: false, message: 'Authentication required.' }
  }

  // Step 2: Check role
  if (!isAdmin(session.user.role)) {
    return { success: false, message: 'Insufficient permissions.' }
  }

  // Step 3: Proceed safely
  await verseRepository.delete(verseId)
  revalidatePath('/admin/verses')
  return { success: true, message: 'Verse deleted.' }
}
```

### Never trust the client for identity:

```ts
// ✅ CORRECT — use session.user.id from the server
export async function purchaseItemAction(itemId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, message: 'Auth required.' }

  await shopRepository.purchase(session.user.id, itemId) // ← server-derived ID
}

// ❌ WRONG — client-provided userId is a security vulnerability
export async function purchaseItemAction(userId: string, itemId: string) {
  await shopRepository.purchase(userId, itemId) // Attacker can pass any userId
}
```

### Do not rely only on Proxy:

Next.js 16 Proxy provides optimistic checks and protects routes at the navigation level. It does not protect Server Actions from direct network requests and is not a complete authorization boundary. Every sensitive Server Action and protected data-access path must perform its own auth and role checks.

---

## 8. Gameplay Implementation Rules

### 8.1 Game Mode Names and Order

The five game modes must be implemented and referenced **exactly** as follows:

| Position | Mode Name | Enum Value |
|---|---|---|
| 1 | Drag & Drop | `DRAG_DROP` |
| 2 | Puzzle | `PUZZLE` |
| 3 | Swap | `SWAP` |
| 4 | **Cue** | `CUE` |
| 5 | Fill | `FILL` |

**Mode 4 is called CUE, not HINT.** The word "Hint" in the context of a game mode is a prohibited reference. The Hint System is a separate feature. Never confuse the two.

Store the order in `lib/constants.ts`:
```ts
export const GAME_MODE_ORDER: GameMode[] = [
  GameMode.DRAG_DROP,
  GameMode.PUZZLE,
  GameMode.SWAP,
  GameMode.CUE,
  GameMode.FILL,
]
```

### 8.2 Journey Stage System Rules

The Journey Stage (LEARN, RECALL, STRENGTHEN, MASTER) is stored on the `Waypoint` record. It affects:

| Rule | LEARN | RECALL | STRENGTHEN | MASTER |
|---|---|---|---|---|
| Hints available | ✅ | ✅ | ❌ | ❌ |
| Time limit | ❌ | ✅ (generous) | ✅ (shorter) | ✅ (strict) |

**These rules are enforced server-side.** The `useHintAction` must check the waypoint's Journey Stage and reject the request if the stage is STRENGTHEN or MASTER — regardless of what the client sends.

The same verse may appear at multiple waypoints with different Journey Stages. This is expected behavior, not an error.

### 8.3 Three-Day Challenge Rules

```
Day 1 (GLIMMER): 20–35% words hidden. Available immediately on waypoint unlock.
Day 2 (GLOW):    40–60% words hidden. Unlocks 24h after Day 1 completion.
Day 3 (RADIANCE): 70–100% words hidden. Unlocks 24h after Day 2 completion.
```

Cooldown enforcement is always server-side:

```ts
// ✅ CORRECT — server checks the unlock timestamp
export async function startGameSessionAction(waypointId: string, dayLevel: DayLevel) {
  const session = await auth()
  if (!session?.user) return { success: false, message: 'Auth required.' }

  const dayProgress = await progressionRepository.getUserDayProgress(
    session.user.id, waypointId, dayLevel
  )

  // WHY: This check happens server-side because client countdown timers
  // are purely cosmetic and can be bypassed by direct API requests.
  // The server compares the current UTC time against the stored unlock
  // timestamp. The client has no authority over this decision.
  if (!isDayPlayable(dayProgress)) {
    return { success: false, message: 'This day is not yet unlocked.' }
  }

  // Proceed with session creation
}
```

### 8.4 Glow Points Are the Only Currency

There is no XP system. No experience points. No separate currency.

Glow Points serve two purposes:
1. They represent achievement (displayed on profile and leaderboard).
2. They are spent in the Oil Shop.

**Badges reward Glow Points only.** Never reference XP in any code, comment, or user-facing string.

### 8.5 Duplicate Reward Prevention

```ts
// WHY: A database unique constraint on (userId, waypointId, dayLevel) in
// UserDayProgress is the last line of defense against duplicate rewards.
// Even if the Server Action is called twice simultaneously, the database
// constraint will reject the second insert. The action handles this error
// gracefully and returns a safe response instead of crashing.
```

Always use database transactions when awarding Glow Points. Always insert a `RewardLedger` record alongside any balance update.

---

## 9. UI/UX Rules

### 9.1 Required States — Non-Negotiable

Every interactive feature must handle all of these states:

| State | Implementation |
|---|---|
| Route loading | `loading.tsx` in the route group |
| Data loading | Skeleton components or `<LoadingSpinner>` |
| Form pending | `<LoadingButton isPending={isPending} />` |
| Success | Sonner `toast.success()` |
| Error | Sonner `toast.error()` |
| Empty | `<EmptyState>` with helpful guidance |
| Disabled | Visual dim + `disabled` attribute during async ops |

Never leave a blank, frozen, or unresponsive UI during any async operation.

### 9.2 Sonner Toast Usage — Mandatory for All Feedback

Sonner is the only toast system. Never use `alert()`. Never fail silently.

```ts
import { toast } from 'sonner'

// ✅ Success
toast.success('Day completed! +120 Glow Points earned.')

// ✅ Error
toast.error('Something went wrong. Please try again.')

// ✅ Info
toast.info('Day 2 unlocks in 23h 14m.')

// ✅ Warning
toast.warning('You only have 1 hint remaining.')
```

Toast persistence:
- Error toasts: persist until user dismisses them.
- All other toasts: auto-dismiss after 4 seconds.

Every Server Action result should be surfaced to the user through a Sonner toast fired from the UI component that called the action.

### 9.3 Reusable Components — Always Check First

Before building a new UI element, check in this order:

1. `components/ui/` — shadcn/ui primitives
2. `components/shared/` — globally shared components
3. `features/[current-feature]/components/` — feature-specific reusable components

If a pattern appears in more than one place → extract it to the appropriate shared location immediately.

### 9.4 Mobile and Touch Support

All game modes must support touch on mobile devices:

- **Drag & Drop / Puzzle:** Tap to select word (highlight), tap a blank to place it. Tap placed word to return to bank.
- **Swap:** Tap a yellow word to select (purple), tap another to swap.
- **Cue / Fill:** Standard mobile keyboard input.

Use `@dnd-kit/core` — it natively handles both mouse and touch events.

### 9.4A Mobile Game Visual Direction — Non-Negotiable

Scripture Memo is a mobile-first game experience, not a conventional dashboard-style web application. Every component, page, and view must feel intentionally designed for a polished mobile game while preserving the calm, devotional identity of the product.

- Design for a 375px mobile viewport first, then enhance the layout for tablets and desktops.
- Use clear visual hierarchy, immersive full-screen compositions, tactile controls, progression maps, reward feedback, game-state indicators, and satisfying transitions where appropriate.
- Buttons and interactive targets must feel touch-friendly and game-like, with a minimum usable target size of 44×44 CSS pixels.
- Gameplay screens must prioritize the active challenge and minimize dashboard chrome, dense tables, and administrative visual patterns.
- Progress, streaks, Glow Points, flames, Journey Stages, cooldowns, badges, and completion states must receive strong visual treatment rather than appearing as plain text fields.
- Shared components must support the visual language of a mobile game; do not accept generic shadcn defaults as the finished product design.
- Desktop layouts should expand the game experience without turning it into a conventional SaaS dashboard.
- Animation, audio, color, and celebration must never compromise accessibility, reduced-motion preferences, readability, or devotional tone.

### 9.4B Tailwind Canonical Syntax

Always use the current canonical utility syntax supported by the installed Tailwind CSS version. Do not introduce legacy aliases merely because they still compile. Treat canonicalization diagnostics from the Tailwind editor tooling as issues to fix before considering a task complete.

For Tailwind CSS 4, use utilities such as `bg-linear-to-r`, `bg-linear-to-b`, and `bg-linear-to-br` instead of the legacy `bg-gradient-to-*` aliases. When syntax guidance may have changed, verify it against the installed Tailwind version or current official Tailwind documentation before implementation.

### 9.5 Confetti

Trigger the `<ConfettiCelebration>` component when a user successfully completes any game mode (all answers correct on Check). Confetti fires after the completion action response is received, not before.

### 9.6 Audio

Audio files live in `public/audio/`. Use `useAudioFeedback()` hook, which:
1. Reads `audioEnabled` from user settings context before playing anything.
2. Plays the appropriate `.mp3` file.
3. Fails silently if the file doesn't exist — never throws.

Required audio files: `pick.mp3`, `drop.mp3`, `error.mp3`, `correct.mp3`, `day-complete.mp3`, `waypoint-complete.mp3`, `badge-unlock.mp3`.

### 9.7 SEO and Metadata — Mandatory

SEO must be implemented extensively using the APIs and file conventions documented by the installed Next.js version. Do not manually add metadata elements to `<head>` when the Next.js Metadata API supports the requirement.

Every relevant public page or route segment must provide accurate, unique metadata, including:

- A descriptive title using the application title template.
- A useful meta description written for the page's actual content and search intent.
- A canonical URL and appropriate metadata base.
- Open Graph and Twitter card metadata with meaningful titles, descriptions, images, and alternative text.
- Robots directives appropriate to the route's visibility.
- Structured data (JSON-LD) where it accurately describes public content and follows the applicable schema.

The application foundation must also include and maintain, where relevant:

- `robots.ts` and `sitemap.ts` containing only indexable public URLs.
- App icons, Apple touch icons, favicon, web app manifest, Open Graph images, and Twitter images.
- Semantic HTML, one clear page heading, descriptive link text, image alternative text, and crawlable public navigation.
- Stable, human-readable URLs and redirects when public URLs change.

Authentication pages, account pages, settings, private notes, gameplay sessions, user-specific progress, admin routes, and other private or personalized screens must use `noindex` and must never be added to the sitemap. SEO must never expose private user data or weaken authentication boundaries.

Metadata belongs with the feature that owns the page. To preserve thin route files, a feature view may export its `metadata` or `generateMetadata`, and the corresponding `app/` file should re-export the default view and metadata in a single export statement whenever the installed Next.js version permits it. Dynamic metadata must be generated server-side from validated, authorized, minimal data.

SEO completion is part of each relevant page's definition of done, not a final cleanup task.

---

## 10. Comments and Documentation Rules

Comment scripts extensively. Every file, every exported function, and every non-obvious logic block must have a comment explaining **why** the decision was made.

### Required comment locations:

**Cooldown enforcement:**
```ts
// WHY: Cooldown checks must always run server-side. Client countdown timers
// are for user experience only — they cannot be trusted for security decisions.
// Any user can craft a network request to bypass a client timer.
```

**Answer normalization:**
```ts
// WHY: User input is compared against normalizedText, not the raw verse text.
// normalizedText is pre-computed as lowercase with all punctuation removed.
// This allows the answer validator to accept "Lord" and "lord," and "lord"
// as equivalent correct answers, matching how humans naturally type.
```

**Swap mode token tracking:**
```ts
// WHY: We track by token position index, not by word text value.
// A verse like "the Lord is my Lord" contains "Lord" twice. If we tracked
// by text, we could not distinguish which instance is in the wrong position.
// Position-based tracking makes swap validation unambiguous for any verse.
```

**Phrase generator determinism:**
```ts
// WHY: The phrase generator uses a deterministic algorithm seeded by the
// verse ID, waypoint number, and day level. This ensures the user sees
// the same phrase chunks if they retry the mode, preventing confusion
// from re-shuffled phrase boundaries.
```

**Reward ledger:**
```ts
// WHY: Glow Points are never updated without a corresponding RewardLedger
// record. The ledger provides an immutable audit trail of all point events.
// If a user's displayed balance ever looks wrong, the ledger can be summed
// to reconstruct the correct total.
```

**Badge engine:**
```ts
// WHY: Badge evaluation is event-driven, not scheduled. After any relevant
// progression event (day complete, streak update, fellowship join), the badge
// engine receives an event and evaluates whether any badge criteria are now met.
// This avoids expensive scheduled background jobs and keeps badge unlocks
// feeling immediate and responsive.
```

**Permission checks:**
```ts
// WHY: Role checks happen in the Server Action, not just in Proxy.
// Proxy protects navigation routes, but Server Actions can be called
// directly via network request. Every sensitive action must be self-protecting.
```

### Forbidden comment style:

```ts
// ❌ Useless — repeats the code
// increment i by 1
i++

// ❌ Useless — states the obvious
// check if user exists
if (!user) return

// ✅ Useful — explains the why
// If the user record is missing despite a valid session, the account may
// have been deleted while the session was still active. We return 401
// rather than 500 to avoid leaking internal state.
if (!user) return { success: false, message: 'Account not found.' }
```

---

## 11. Security Rules

Follow `docs/SECURITY-AUDIT.md` in full. These are the non-negotiable minimums:

- Validate all input with Zod in every Server Action, before any other logic.
- Check authentication in every protected Server Action.
- Check role in every admin or super-admin Server Action.
- Never trust client-side cooldown state.
- Never trust client-side reward values or completion status.
- Prevent duplicate rewards with database constraints and transactions.
- Never expose user email addresses in leaderboard, fellowship, or any public query.
- Sanitize all user-generated content before rendering.
- Rate-limit login, registration, password reset, and game completion endpoints.
- Log all admin privilege actions (cooldown overrides, manual badge awards, role changes) in `AuditLog`.

---

## 12. Data and Transaction Rules

Use **database transactions** for all operations that involve more than one write:

- Completing a game mode (session update + mode attempt record)
- Completing a day (day progress + RewardLedger + balance update + streak update + cooldown set + badge evaluation trigger)
- Unlocking next waypoint (waypoint progress record creation)
- Purchasing from Oil Shop (balance deduction + inventory update + ledger record)
- Joining or leaving a fellowship (membership record + any ledger events)

**Reward ledger rule:** Never update a Glow Points balance without simultaneously inserting a `RewardLedger` record in the same transaction. The ledger is the source of truth.

---

## 13. JSON Data Persistence Rules

PostgreSQL through Prisma is the source of truth for durable application data.
Do not use JSON files as an application database, user-data store, cache of
record, reward ledger, progression store, authentication store, or substitute
for a migration.

JSON files are permitted only for static, version-controlled data such as seed
fixtures, immutable curriculum source material, or build-time configuration when
the owning feature clearly benefits from that format. Such files must:

- Live inside the owning feature's `data/` folder, or `prisma/` when used only by
  a documented seed workflow.
- Have a documented schema and be validated with Zod before use.
- Contain no secrets, credentials, tokens, private notes, email addresses, or
  other user data.
- Be updated atomically by any approved maintenance script; scripts must never
  leave partially written JSON after failure.
- Avoid runtime mutation from application code. Data that changes while the app
  runs belongs in PostgreSQL and must be accessed through repositories.

JSON request bodies, third-party payloads, imported fixtures, and parsed JSON are
untrusted `unknown` input until they pass Zod validation. JSON-LD used for SEO is
presentation metadata, not persistence, and must not expose private data.

---

## 14. Cross-Feature Communication Rules

Features must be self-contained. When cross-feature data access is needed:

1. **Shared types** — extract to `types/`
2. **Shared utilities** — extract to `lib/`
3. **Repository import** — Feature A's action may import Feature B's repository
4. **Never** import from another feature's `components/`, `hooks/`, or `views/`
5. **Never** call one feature's Server Action from another feature's Server Action

---

## 15. Barrel Files

- Barrel files (`index.ts`) are permitted only at the feature root (`features/[x]/index.ts`).
- **Never** create barrel files inside sub-folders (`actions/index.ts`, `components/index.ts` — these are violations).
- Barrel files expose only the feature's public API. Never re-export internal implementation details.

---

## 16. AI Work Process

When implementing any task, follow this sequence without skipping steps:

1. **Identify** which feature owns the work.
2. **Check** `docs/PRODUCT-OVERVIEW.md` for any relevant rules or specifications.
3. **Create or update schemas** if user input is involved.
4. **Create or update repositories** for any database access needed.
5. **Create or update Server Actions** for orchestration.
6. **Create or update UI components** needed by the feature.
7. **Create or update views** that compose the feature screen.
8. **Verify route files** remain one-line re-exports.
9. **Add all required states**: loading, pending, success, error, empty, disabled.
10. **Add Sonner toasts** for all user-facing outcomes.
11. **Add comments** explaining all non-obvious logic.
12. **Run `tsc --noEmit`** and fix all TypeScript errors.
13. **Review against the security checklist** before declaring the task complete.

---

## 17. Pre-Task Checklist

Before starting any implementation task, confirm:

- [ ] I have read the relevant section of `docs/PRODUCT-OVERVIEW.md` for this feature.
- [ ] I know which feature folder this work belongs in.
- [ ] I know which route file will re-export this view (one line only).
- [ ] I will not write any Prisma queries outside of a repository file.
- [ ] I will validate all input with Zod before doing anything else in each action.
- [ ] I will check auth and role before any data access in each action.
- [ ] I will use Sonner for all user-facing feedback.
- [ ] I will add loading, pending, success, error, and empty states.
- [ ] I will use `CUE` (not `HINT`) as the game mode name in all code and UI.
- [ ] I will use Glow Points only — no XP system exists.
- [ ] I will not introduce any `any` type.

---

## 18. Final Review Checklist

Before declaring any task complete, verify all of the following:

- [ ] File location matches the feature-based architecture.
- [ ] No Prisma query exists outside a repository file.
- [ ] No route file contains any logic.
- [ ] No `any` type was introduced.
- [ ] All user input is validated with Zod.
- [ ] Auth and permission checks are present in every protected action.
- [ ] Loading and pending states are implemented.
- [ ] Sonner toasts are implemented for all outcomes.
- [ ] Reusable components were used where applicable.
- [ ] Game Mode 4 is referenced as "Cue" throughout — never "Hint."
- [ ] Glow Points is the only reward currency — no XP references.
- [ ] Journey Stage rules (hint/time) are enforced server-side.
- [ ] Important logic is commented with explanations of why, not just what.
- [ ] TypeScript passes with `tsc --noEmit`.

---

## 19. Forbidden Patterns

The following are architectural violations. Never do any of these:

| Forbidden | Why |
|---|---|
| Create a `src/` folder | Violates root-based structure standard |
| Use `any` type | Defeats TypeScript's purpose |
| Call Prisma outside a repository | Violates strict data flow |
| Put logic in route files | Routes are one-line re-exports only |
| Put feature-specific components in root `components/` | Violates feature encapsulation |
| Create empty/speculative folders | Only create folders when files go inside |
| Call one feature's action from another feature's action | Creates tight coupling |
| Trust client-side state for security decisions | Server is the authority |
| Send point amounts from the client | Points are calculated server-side only |
| Expose user email in any public query | Privacy violation |
| Skip loading or error states | Leaves users with frozen/blank UI |
| Skip Sonner toasts for important actions | Silent failures are bad UX |
| Reference "Hint Mode" as a game mode | Mode 4 is Cue Mode |
| Reference XP or experience points | Only Glow Points exist |
| Create barrel files inside sub-folders | Causes circular deps |
| Leave `console.log` in production code | Log using `lib/logger.ts` |

---

*This AGENTS.md is the law. When in doubt, re-read it before writing.*
