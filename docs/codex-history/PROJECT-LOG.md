# Scripture Memo Project Log

### 2026-08-31 — Radiance completion regression accepted

- The project owner completed the accelerated but production-backed Glow and
  Radiance path for Phase 30 Flow 8.
- Confirmed the third flame, one Glow award, waypoint completion, automatic next
  published waypoint unlock, immediate next Glimmer readiness, and completed
  verse access through the Vault and Sanctuary.
- Preserved this completed waypoint as the fixture for the remaining duplicate
  reward, badge, and Vault regression checks.

### 2026-08-31 — Player surfaces normalized around admin testing menus

- Recorded project-owner acceptance of Phase 30 Flow 7 after the production
  start action returned the expected server-owned cooldown rejection.
- Removed administrator-only testing buttons and completed-day replay controls
  from individual challenge cards so their normal presentation matches players.
- Consolidated cooldown verification, audited cooldown override, and day replay
  into one contextual **Admin testing** menu on Day Selection.
- Moved completed-mode replay into the existing gameplay three-dot menu instead
  of rendering a separate administrator banner in the gameplay header.
- Retained the explicit test-session identity notice because isolated tests must
  never be mistaken for reward-bearing learner progression.

### 2026-08-31 — Three-Day Challenge accepted and cooldown QA exposed

- Recorded project-owner acceptance of Phase 30 Flow 6 after the five Glimmer
  modes produced one flame and a persisted 24-hour Glow cooldown.
- Added an ADMIN-only **Verify server lock** control to active cooldown cards.
  It invokes the production session-start action and reports success only for
  the specific server-owned `PRG-004` cooldown rejection.
- Kept cooldown override separate so verification cannot silently unlock or
  alter learner progression.

### 2026-08-31 — Journey Stage regression accepted

- The project owner manually verified the ADMIN Journey Stage launcher across
  Learn, Recall, Strengthen, and Master.
- Confirmed the production timer and hint restrictions while preserving learner
  progress, rewards, streaks, badges, flames, cooldowns, and hint balances.
- Marked Phase 30 manual Flow 5 as passed. Manual flows 6–16 remain.

### 2026-08-29 — Isolated Journey Stage QA launcher

- Added an ADMIN-only launcher to `/admin/waypoints` for selecting any assigned
  waypoint and any of the five real game modes without playing through earlier
  curriculum or waiting for cooldowns.
- Added persisted admin-test session identity and target-mode fields so Recall,
  Strengthen, and Master tests use the production server-owned attempt timers,
  answer validation, and Journey Stage hint gates.
- Terminated successful test submissions before learner progression, Glow,
  Beacon XP, streak, badge, flame, reward, cooldown, or hint-inventory branches.
- Excluded test sessions from learner-history locks, active campaign resumption,
  completed-day detection, and badge metrics; every test mutation also rechecks
  the caller's current administrator role.
- Applied migration `20260829170000_add_admin_gameplay_test_sessions` to the
  local database and regenerated the Prisma client.
- Updated the Phase 30 Flow 5 checklist with a short, repeatable manual path.

### 2026-08-28 — Sanctuary study-reader redesign

- Rebuilt the Sanctuary as a mobile-first devotional reader with a compact
  verse hero, dedicated Study and My Notes views, and tactile shared navigation
  controls that retain clear pending feedback.
- Preserved the imported Markdown hierarchy while presenting major study-guide
  headings as readable themed sections, including distinct treatments for key
  lessons, application, reflection, and prayer.
- Removed the imported guide preamble that repeated the hero verse, and softened
  the source emphasis in Tags and Key Lesson so those sections read naturally.
- Added an expandable mobile study path and a sticky study path in the
  Sanctuary-owned desktop companion column.
- Added a helpful notes-first empty state for verses whose study material is
  pending.
- Expanded the large-screen Sanctuary canvas and widened the private-note
  companion at extra-large desktop sizes without reducing either mobile card.
- Compacted the desktop Study Path navigation so it supports scanning without
  dominating the private-note companion column.
- Updated the Sanctuary loading skeleton and English/Spanish message contracts
  to match the new composition.

### 2026-08-09 — Causal gameplay celebration order

- Reordered every gameplay-mode celebration to show Mode Success first, then
  each newly unlocked badge, then a changed streak celebration.
- Preserved the final Fill continuation so Waypoint Complete follows those
  screens without repeating Mode Success or skipping badge rewards.

### 2026-08-09 — Interchangeable duplicate gameplay tiles

- Changed Drag & Drop correctness feedback to compare normalized visible words
  instead of requiring an identical repeated word to return to its hidden source
  index; unique IDs still preserve one-to-one dragging and placement.
- Applied the same fairness rule to visually identical Puzzle phrases while
  retaining final trusted full-answer validation on the server.
- Added regression coverage for swapped repeated words and repeated phrases,
  plus a control proving genuinely different words remain incorrect.

### 2026-08-09 — Reliable concurrent reads on Prisma Postgres Local

- Reproduced the admin verse-list and gameplay connection failure with the same
  parallel Prisma reads outside Next.js; sequential reads remained healthy.
- Added shared PrismaPg pool configuration that queues loopback development
  reads through one connection because Prisma Postgres Local was closing extra
  concurrent TCP connections in this environment.
- Kept hosted and production pool concurrency unchanged, covered the boundary
  with tests, and reused the configuration in explicit local fixture commands.

### 2026-08-09 — Local gameplay database reconnection

- Traced the gameplay-session failure to the stopped local `scripture-memo`
  Prisma Postgres process; no application query or session record was defective.
- Restarted the named local database on the configured TCP port `51214`, verified
  its running status, and stopped the incidental unused `default` instance.

### 2026-08-09 — Day Selection locked-state localization repair

- Added the missing `DaySelection.locked` message to English, Spanish, and
  French so locked Glow and Radiance cards no longer interrupt the first
  waypoint screen while Glimmer is ready.
- Confirmed Glimmer progression is intentionally initialized on first play;
  local fixture accounts do not require a pre-created day-progress record.

### 2026-08-05 — Extra-small league title fit

- Preserved the prominent 92px mobile emblem from 360px upward while returning
  it to 80px below 360px, where the larger asset squeezed the title column.
- Reduced only the extra-small league-title type and kept it on one line; the
  168px larger-screen emblem remains unchanged.

### 2026-08-05 — More prominent league emblem

- Increased the weekly league emblem from 80px to 92px at the mobile baseline
  and from 144px to 168px on larger screens.
- Expanded the matching grid columns so the emblem gains hierarchy without
  overlapping or compressing the adjacent league information.

### 2026-08-05 — Live league deadline summary

- Replaced the league-header player count with a compact live deadline such as
  `Ends in 3d 12h`, while retaining the exact UTC reset date beside it.
- The countdown initializes after hydration to avoid server/device-clock markup
  differences and refreshes once per minute without reloading leaderboard data.
- Added compact deadline copy for English, Spanish, and French.

### 2026-08-05 — Three-zone league position bar

- Divided the weekly league bar into persistent promotion, stay, and demotion
  colours using the approved 30-player structure: 7, 18, and 5 places.
- Added compact `Top 7` and `Bottom 5` labels beneath the outer zone headings
  and removed the redundant status blocks below the bar.
- Positioned the learner marker against the full cohort scale so it corresponds
  to the same zone boundaries shown visually.

### 2026-08-05 — Compact leaderboard help label

- Shortened the league-header help control to `Rank info`, with equally compact
  Spanish and French labels, while retaining the full explanatory drawer title.

### 2026-08-05 — Leaderboard help and extra-small header control

- Reframed the league browser as `How rankings work` with a question-mark icon
  and equal height beside the weekly reset card.
- Below 360px, the accessible control becomes icon-only so the reset date keeps
  enough width to remain readable.
- Expanded the league drawer with compact translated rules for earning points,
  weekly resets, promotion and demotion, Saint Crowns, and the full league path.

### 2026-08-05 — Compact mobile league header

- Rebalanced the weekly league header for 375px with a smaller emblem, tighter
  spacing, and compact type while preserving the larger desktop composition.
- Removed mobile title truncation so localized league names can wrap cleanly.
- Placed the league browser and weekly reset information in one efficient row,
  reducing vertical travel without shrinking either control below touch size.

### 2026-08-05 — Leaderboard learner label and mobile spacing

- Replaced the signed-in learner's leaderboard display name plus appended
  qualifier with the single localized label `You`.
- Reduced rank plate width, height, type, and crown size at the 375px baseline;
  the established larger proportions still return from the `sm` breakpoint.
- Commented out the rankings-heading player count until the live leaderboard
  population grows, while retaining the localized markup for easy restoration.

### 2026-08-05 — Leaderboard hydration and LCP correction

- Removed hydration-unsafe per-row Framer Motion state. Server rendering had
  emitted translated rows while a reduced-motion phone hydrated them without a
  transform, producing mismatched inline styles across the full leaderboard.
- Leaderboard rows now render as stable semantic articles on server and client.
- Added explicit eager loading for the first three leaderboard portraits and
  retained lazy loading below the fold, resolving Next.js's avatar LCP warning.

### 2026-08-05 — Safe physical-device authentication testing

- Added one development-only origin source shared by Next.js asset protection
  and Better Auth trusted-origin validation for LAN device testing.
- Allowed `http://192.168.100.11:3000` by default, with a documented
  `DEV_ALLOWED_ORIGINS` override for DHCP address changes.
- Changed the login form's no-JavaScript fallback to POST so blocked client
  assets can never place credentials in the URL or access logs again.

### 2026-08-05 — Mobile-first leaderboard proportions

- Corrected the 375px leaderboard after oversized fixed columns squeezed player
  names. Rank plates, portraits, gaps, flags, and score pills are compact first.
- Preserved visual breathing room through row height and padding rather than
  consuming the flexible identity column; desktop enhances those proportions.

### 2026-08-05 — Podium rank plates and leaderboard headers

- Added aligned Rank, Player, and Beacon Points headers to the leaderboard list.
- Added custom filled crown icons and metallic gold, silver, and bronze rank
  plates for displayed positions one through three.
- Changed the signed-in learner's row and non-podium rank plate to violet so
  their current position remains visually distinct without extra explanatory text.

### 2026-08-05 — Leaderboard row clarity and player details

- Replaced the mixed crown/compass position column with sequential visible
  positions for real players and Trail Rivals; rivals retain a compass beside
  their name so the simulation remains transparent.
- Reduced each row to its scope-relevant Beacon Points. Selecting a row now
  opens a compact dialog with secondary Beacon statistics.
- Replaced Unicode regional-indicator flags with packaged SVG assets so Windows
  cannot expose their underlying two-letter country symbols.
- Added distinct visual icons to the weekly points, Beacon Level, lifetime
  points, and Crowns cards in the player-details dialog.

### 2026-08-05 — Presence, country flags, and Trail Rivals

- Simplified player location to a visual country flag and added a throttled,
  server-timed five-minute online indicator around real leaderboard portraits.
- Added viewer-specific Trail Rivals to sparse League and Country boards only.
  Their deterministic weekly simulation includes idle days and discrete play
  sessions so scores can remain stagnant or rise naturally between refreshes.
- Kept all official ranking math isolated from Rivals: they use a compass marker,
  have no user/progression records, and cannot affect promotions, demotions,
  Crowns, rewards, Fellowship rankings, or permanent history.
- Added presence and rival simulation tests and applied the additive presence
  migration without exposing exact last-seen timestamps.

### 2026-08-05 — Player portraits and Partner frames

- Added twelve independent transparent animal portraits: lion, dove, deer,
  bull, owl, donkey, rabbit, fox, panda, elephant, giraffe, and otter.
- Added a mobile-first portrait picker to Settings with one standard frame and
  six Partner-selectable frame treatments.
- Added persisted avatar, frame, and Partner-entitlement fields with a safe
  additive migration and server-side enforcement of premium frame access.
- Updated every Great Beacon ranking row to show the learner's selected animal
  and frame consistently, with localized picker copy in all shipped languages.
- Added catalog tests and documented how future donation or subscription flows
  will grant Partner entitlement without changing the avatar contract.

### 2026-08-05 — League emblems and leaderboard visual journey

- Created nine independent transparent league emblems for Traveler through
  Saint, with localized names kept outside the raster artwork.
- Added a responsive League Journey drawer/dialog that shows reached, current,
  and future leagues so upcoming progression is visible from the leaderboard.
- Rebuilt the leaderboard around a compact game-like league panel, current-rank
  marker, promotion/stay/demotion track, and one readable mobile-first ranking
  list with distinct top-three and current-player treatment.
- Added localized League Journey copy in English, Spanish, and French and
  extended Beacon tests to protect emblem uniqueness and league ordering.

### 2026-08-04 — Great Beacon weekly leagues and progression

- Added permanent Beacon XP and Levels, resettable Weekly Beacon XP, nine
  promotion leagues, and lifetime Saint Crowns while retaining Glow Points as
  the only spendable currency.
- Added transaction-safe gameplay awards, UTC Monday competition windows,
  30-player cohorts, promotion/demotion decisions, and an immutable XP ledger.
- Reworked leaderboard meanings to My League, Country, Fellowship, and All Time
  and added league/reset context plus promotion and demotion zones.
- Added post-mode XP progress and level-up feedback, localized in English,
  Spanish, and French, together with pure progression and week-boundary tests.
- Applied migration `20260804190000_add_beacon_leagues`. TypeScript, targeted
  lint, five Beacon progression tests, localization checks, and diff checks
  pass; project-owner gameplay and responsive acceptance remain pending.

### 2026-08-04 — Navigation pending lifecycle corrected

- Replaced `NavigationButton`'s permanent click-state flag with React transition
  state around the internal Next.js router navigation.
- Pending feedback now ends when the destination pathname or query-string view
  commits, fixing Great Beacon scope buttons that remained on “Opening.”
- Prevented same-destination clicks from entering pending and retained native
  browser behavior for modifier clicks and external destinations.
- TypeScript, targeted ESLint, and diff validation pass.

### 2026-08-04 — PostgreSQL SSL mode made upgrade-safe

- Added one credential-safe connection URL normalizer that converts pg’s
  ambiguous `prefer`, `require`, and `verify-ca` aliases to explicit
  `sslmode=verify-full` while respecting intentional libpq compatibility.
- Applied the same normalization to the application Prisma singleton, Prisma
  CLI configuration, and every standalone seed repository.
- Added tests for legacy modes, explicit compatibility, and secret-safe invalid
  URL errors; TypeScript, targeted ESLint, Prisma validation, and diff checks
  pass.
- Verified the configured `DATABASE_URL` initializes PrismaPg without emitting
  the pg-connection-string security warning.

### 2026-08-04 — Stale next-intl development cache cleared

- Confirmed `next.config.ts` correctly registers the installed next-intl plugin
  against `i18n/request.ts`; no configuration code change was required.
- Removed the generated `.next` cache because the active development server had
  started before the plugin configuration was loaded.
- Verified a fresh Next.js 16 development process serves `/login` with HTTP 200
  and resolves `getLocale()` and `getMessages()` without the config-file error.

### 2026-08-04 — Phase 27 Great Beacon implemented

- Built privacy-safe Global, Country, and Fellowship rankings ordered by
  completed waypoints, Glow Points, current streak, and stable server-only
  tie-breakers.
- Added an animated mobile-first podium, paginated positions four and below,
  a highlighted pinned current-player row, scope controls, empty states, and a
  route skeleton in English, Spanish, and French.
- Kept emails and raw user IDs out of the leaderboard response contract and
  documented the implemented privacy and index controls in the security audit.
- Connected the hidden Beacon Challenger badge to a fresh authenticated
  server-derived global rank through a Server Action, with an idempotent badge
  transaction and an included activation migration.
- Added a Great Beacon entry point to the authenticated game home without
  squeezing the existing six-item mobile navigation bar.
- TypeScript, targeted ESLint, badge tests, localization contract tests, and
  diff checks pass. The production build reached compilation but the sandbox
  could not download the project’s existing Google-hosted Geist fonts.
- Applied migration `20260804163000_activate_leaderboard_badge` successfully to
  the configured PostgreSQL database; Prisma reports all migrations applied.

### 2026-08-04 — Prisma Compute clean-install failure repaired

- Regenerated `package-lock.json` with npm 10.9.8, matching the package manager
  version reported by Prisma Compute rather than relying on npm 11 resolution.
- Added the nested `@swc/helpers@0.5.23` lock entry required by `next-intl` while
  preserving Next.js's direct `@swc/helpers@0.5.15` dependency.
- Reproduced the original failure locally with npm 10, then confirmed the
  repaired lockfile passes `npm ci --dry-run` with that exact npm version.

### 2026-08-04 — Phase 26 completed

- The project owner accepted the final mobile-first Fellowship detail layout.
- Phase 26 functional, responsive, invitation, membership, management, and
  private-access work is now marked complete in the roadmap.
- Independently authored insignia assets remain a documented end-of-project
  enhancement and do not block phase completion.

### 2026-08-04 — Fellowship detail rebuilt mobile-first

- Stacked the insignia, fellowship identity, membership count, and actions at
  375px so long names retain comfortable reading space.
- Simplified the mobile tab controls by prioritizing labels and restoring their
  decorative icons only when wider screens provide sufficient room.
- Made leaderboard metrics equal-width mobile controls beneath each member and
  reformatted the full component into documented, readable multiline code.

### 2026-08-04 — Mobile-first and maintainability rules strengthened

- Promoted the 375px mobile composition from a general direction to the primary
  implementation order: mobile must be completed before breakpoint enhancements.
- Added authoritative multiline formatting requirements so JSX, functions,
  repository queries, and object structures remain easy to review and debug.
- Expanded the commenting standard to require novice-friendly documentation and
  useful inline explanations around non-obvious implementation stages.
- Mirrored the responsive implementation order in the UI/UX guide.

### 2026-08-04 — Mobile fellowship leaderboard compacted

- Reworked member rows into compact mobile-first cards that keep each player's
  progress directly beneath their identity instead of in a detached table row.
- Hid the desktop column header on small screens and retained the wider table
  presentation from the `sm` breakpoint upward.

### 2026-08-04 — Fellowship settings show current invite access

- Added the leader-only current invite code to the Invite Access settings card.
- Kept the displayed value synchronized when the leader rotates the code, so
  the replacement appears immediately without a page reload.

### 2026-08-04 — Completed-waypoint summaries reconciled

- Fixed the server-verified Radiance completion transaction so it increments
  the indexed `UserProfile.totalWaypointsCompleted` summary exactly once.
- Added and applied a data migration that reconstructs every existing profile
  total from authoritative completed `UserWaypointProgress` records, correcting
  the shared zero shown in the Vault, settings, and Fellowship rankings.
- Separated Fellowship member progress metrics into distinct touch targets with
  formatted values, accessible labels, and explanatory tooltips.

### 2026-08-04 — Fellowship detail content organized into tabs

- Kept fellowship identity, invitation, and leader settings actions visible in
  the hero while moving Members, leader-only Requests, and About content into a
  compact responsive tab surface.
- Added a pending-request badge and opens the Requests tab first for leaders
  whenever an applicant needs attention; otherwise Members remains the default.
- Added localized English, Spanish, and French labels and access explanations.

### 2026-08-04 — Private Fellowships gained approval-based access

- Made public and private Fellowships discoverable together while clearly
  labelling their access model; public groups still join immediately.
- Added durable private join requests from both directory cards and shared
  invitation links, including learner cancellation and duplicate prevention.
- Added a leader-only request queue with approve/reject decisions and bounded
  resolved history. Approval creates membership transactionally and triggers
  trusted Fellowship badge evaluation for the accepted learner.
- Added the Prisma request lifecycle, migration, server authorization, localized
  English/Spanish/French feedback, and updated product/security documentation.

### 2026-08-04 — Dedicated UI/UX implementation guide established

- Added `docs/UI-UX-GUIDE.md` as the practical design reference beneath the
  authoritative root instructions, consolidating theme integrity, palette,
  surfaces, buttons, navigation, drawers, motion, Luna, responsive behavior,
  accessibility, and required interaction states.
- Added a lightweight manual light/dark/mobile/desktop acceptance checklist and
  explicitly deferred automated screenshot regression testing until primary
  functionality stabilizes.
- Linked the guide from `AGENTS.md` and the product UI/UX requirements so future
  player-interface work must consult one current reference rather than infer
  decisions from project history.

### 2026-08-04 — Invitation theme scope corrected

- Corrected the real cause of inconsistent invitation buttons: the page painted
  a dark surface while resolving light-theme button tokens and inherited text.
- Scoped both valid and expired invitation surfaces to the dark token set, so
  their normal Button and NavigationButton variants now match other dark pages
  without any button-specific styling override.

### 2026-08-04 — Invitation button overrides removed

- Removed invitation-page color, border, typography, height, and interaction
  overrides. Its actions now select only the shared default/outline variants and
  large size, matching normal buttons without local restyling.

### 2026-08-04 — Navigation and action buttons unified visually

- Made NavigationButton use the identical variant and Tailwind merge path as the
  normal Button while retaining Link semantics and route-pending feedback.
- Removed the invitation-only depth workaround. Button, LoadingButton, and
  NavigationButton now share one source for color, bevel, and interaction motion.

### 2026-08-04 — Invitation actions matched established button depth locally

- Applied the approved UI Foundation lower-bevel and pressed-depth treatment to
  the invitation page's Open, Join, Login, and Create Account controls only.
- Left existing shared button styling unchanged and recorded the scope rule that
  new screens must reuse approved visuals without redesigning older surfaces.

### 2026-08-04 — Fellowship invitations survive authentication and onboarding

- Replaced directory-prefill share URLs with a dedicated public
  `/join/[inviteCode]` experience that previews minimal Fellowship identity and
  requires an explicit Join action.
- Preserved validated internal return paths through Better Auth login, account
  registration, and first-time translation selection. Existing and new players
  now return to the same invitation after authentication/onboarding.
- Added a recoverable expired-invitation screen for malformed, unknown, and
  rotated codes, plus tests protecting the return flow from open redirects.

### 2026-08-04 — Fellowship invitation interaction refined

- Added a true bottom-drawer entrance and exit on mobile while retaining the
  centered modal presentation on larger screens.
- Moved invite-code rotation out of the sharing panel and into leader settings.
- Promoted opaque, tactile 44-pixel close controls into the shared Dialog and
  Sheet primitives, and changed Fellowship back navigation from ghost links to
  visible shared navigation buttons.

### 2026-08-04 — Fellowship invitations moved into a responsive panel

- Replaced the permanently visible invite code on the Fellowship page with one
  leader-only Invite button. It opens as a bottom drawer on mobile and a centered
  modal on larger screens.
- Added native sharing, copy-link, and copy-code actions. Shared links prefill
  the directory invite field so recipients do not need to transcribe the code.
- Added secure leader-only invite rotation under a repository-owned advisory
  lock; rotating immediately invalidates the previous secret.

### 2026-08-04 — Fellowship insignia artwork correction deferred

- Project-owner review confirmed that atlas-derived insignias remain visually
  off-center despite cell isolation and painted-bound trimming.
- Recorded a Post-Roadmap Extra to replace the atlas with twelve independently
  authored square insignia assets after the main game is complete. Existing
  insignia keys will remain stable so Fellowship data needs no migration.
- The current assets remain temporary; the earlier centering claim below did
  not meet visual acceptance and must not be treated as final artwork approval.

### 2026-08-04 — Insignia cropping and navigation feedback corrected

- Replaced fractional CSS atlas sampling with twelve physically cropped WebP
  assets, eliminating off-center insignias and neighboring-cell bleed.
- Follow-up visual validation now trims each medallion to its actual painted
  bounds and reapplies identical square padding, so generated artwork that was
  uneven inside its atlas cell is genuinely centered in every background.
- Added a documented deterministic atlas-slicing script so future source art can
  regenerate the same safe catalogue without manual crop drift.
- Added the shared `NavigationButton`, whose required pending label gives
  immediate loading feedback for button-styled links. Applied it across
  Fellowship Open, View, Create, Manage, and back navigation.
- Promoted pending navigation feedback into the root implementation rules.

### 2026-08-04 — Fellowship identity and leader settings added

- Removed the duplicate View/Open destination from membership cards; members
  now receive one clear Open action while public non-members retain View + Join.
- Generated an original 12-insignia Scripture Memo atlas from the supplied
  visual references and added a touch-friendly fixed-catalogue picker to create
  and edit flows. Arbitrary image paths and uploads are rejected by Zod.
- Added a leader-only settings route for name, description, public/private
  discovery, and insignia changes while preserving the stable fellowship slug.
- Added and applied migration `20260804094500_add_fellowship_insignia`, owner-
  scoped repository locking, localized English/Spanish/French UI, and tests.

### 2026-08-04 — Fellowship invitations gained native sharing

- Added a touch-friendly Share action beside Copy on member-visible fellowship
  invite codes. Supported devices open their native share sheet with the
  fellowship name, private code, and fellowship entry route.
- Browsers without native sharing copy the complete invitation instead, while
  cancellation remains silent and operational failures use persistent Sonner.
- Added matching English, Spanish, and French interface messages.

### 2026-08-03 — Better Auth password recovery implemented

- Added localized forgot-password and reset-password routes, forms, Zod
  validation, Sonner feedback, and a recovery link from the login form.
- Better Auth remains responsible for reset-token creation and validation,
  one-hour expiry, password hashing, and revocation of existing sessions.
- Added the named `LIGHT_DEV` and `PROD` delivery boundary. Light Dev downloads
  a request-scoped text file containing the reset URL, persists no token, and is
  forbidden when `NODE_ENV=production`; the production email adapter remains a
  focused seam for a future provider.
- Added application and Better Auth rate limits for reset requests and attempts,
  generic account-enumeration-safe responses, and noindex recovery metadata.
- TypeScript and focused ESLint validation passed. Manual browser acceptance of
  download, callback, password replacement, and session revocation remains.

### 2026-08-03 — Phase 26 Fellowships implemented

- Added protected, localized Fellowship directory, creation, public joining,
  private invite-code joining, member detail, invite sharing, leaving, and a
  member-only progress ranking without emails or raw user IDs.
- Added locked repository transactions for create/join/leave, safe name and
  description validation, a three-per-day creation limit, unique invite codes,
  and a creator-leader leave guard.
- Added server-derived Fellowship badge metrics and activated Community Member
  and Faith Builder through migration `20260803143000_activate_fellowship_badges`.
- Added persistent player navigation, route loading UI, English/Spanish/French
  messages, schema tests, badge tests, and locale-contract coverage.
- Phase 26 implementation is ready for project-owner manual acceptance.

### 2026-08-03 — Settings save action given a visual icon

- Added a save icon to the localized Settings submit button while preserving its
  pending and disabled behavior.

### 2026-08-03 — French interface support added

- Added French to the persisted Settings selector, locale schema, authenticated
  preference synchronization, request catalogue loader, and browser-language
  detection, including regional variants such as `fr-CA` and `fr-FR`.
- Added French player-interface messages across navigation, Settings, map,
  gameplay, celebrations, Vault, Sanctuary, Oil Shop, badges, authentication,
  and recoverable errors. New untranslated keys safely inherit English instead
  of breaking a request.
- Extended locale tests and localization documentation for the third language.

### 2026-08-03 — Map markers and Settings statistics localized

- Moved the winding trail's current-map badge, current-position callout, trail
  headings, waypoint ranges, return control, and accessible waypoint status into
  the shared English/Spanish message catalogues.
- Localized all four Settings summary cards and the statistics-region label,
  including the best-streak supporting value.
- Re-ran locale message parity, TypeScript, and focused ESLint validation.

### 2026-08-03 — English/Spanish localization foundation completed

- Added `next-intl` request configuration, English and Spanish message
  catalogues, document language metadata, and shared client/server providers.
- Added a persisted interface-language setting and applied migration
  `20260803101105_add_interface_locale`; verified the configured PostgreSQL
  database reports all 13 migrations applied.
- Locale resolution now uses account preference, then secure cookie, then
  browser language, with English as the safe fallback. Private player URLs stay
  stable and locale-neutral.
- Localized the principal player shell, settings, Home, map and day selection,
  gameplay modes, hints, completion and streak celebrations, Vault, Sanctuary,
  badge collection/unlock, and Oil Shop interface. Bible translations and
  admin-authored content remain explicitly separate from interface locale.
- Added `docs/LOCALIZATION.md` and `npm run test:i18n` to document and enforce
  the extension path for future languages. Admin screens remain English-only.

### 2026-08-03 — Phase 25 accepted and contextual panel deferred

- Marked the Oil Shop phase complete after implementation and project-owner
  review of its responsive catalogue, previews, purchasing, and celebration.
- Recorded the optional large-screen contextual player panel under post-roadmap
  extras so it can be designed later without delaying the normal phase flow.

### 2026-08-03 — Oil Shop close controls made opaque

- Forced the pack-preview and purchase-celebration close buttons to retain the
  solid shop-purple surface in light and dark themes instead of inheriting the
  translucent outline-variant background.

### 2026-08-03 — Oil Shop desktop dashboard completed

- Expanded the large-screen shop to a dashboard composition with catalogue and
  category tabs on the left and a persistent sticky selected-item panel on the
  right, matching the approved game-store direction.
- Desktop item selection updates the detail panel without opening an overlay;
  mobile and tablet continue using the compact preview modal.
- Kept the server-owned Buy action, balance checks, pending lock, success sound,
  and purchase celebration identical across responsive presentations.

### 2026-08-03 — Shared desktop player shell added

- Extended the protected player navigation into a persistent desktop rail for
  Home, Map, Vault, Shop, and Settings while retaining the approved mobile bar.
- Added a compact Luna-flame brand control, tactile active destinations, and a
  bottom-anchored Settings entry without converting the game into a SaaS shell.
- Active gameplay sessions continue to hide global navigation so the timed and
  focused challenge experience remains unchanged.

### 2026-08-03 — Purchase hint balance count-up added

- Passed the learner's pre-purchase and post-purchase hint balances into the
  success screen and initially displays the earlier total.
- Delayed the discrete count-up until the modal, Luna, particles, rays, and item
  entrances have settled, making the new available total the final visual beat.
- Reduced-motion preferences skip stepped animation and reveal the trusted final
  balance after the same sequencing delay.

### 2026-08-03 — Purchase celebration depth layers corrected

- Separated God rays into a dedicated background layer so its mask no longer
  clips Luna or the purchased item artwork.
- Kept the item above both Luna and the light treatment with explicit depth
  layers, and lengthened the ray mask into a gradual transparent falloff.
- Reduced ray opacity and softened the central amber bloom so the effect fades
  naturally into the modal rather than ending at a hard circular edge.

### 2026-08-03 — Oil Shop celebration space and light refined

- Removed the redundant Awesome button from the purchase celebration; the
  tactile close control, backdrop dismissal, and Escape key remain available.
- Added a slowly rotating, softly pulsing radial God-ray glow behind Luna while
  preserving reduced-motion handling through Motion's application settings.
- Replaced the pack-preview modal's plain close glyph with the same tactile,
  disabled-during-purchase close button used by the celebration.

### 2026-08-03 — Purchase celebration fitted, sounded, and previewed

- Rebuilt the Oil Shop success modal around a bounded mobile viewport grid so
  its illustration stage contracts on short screens and the entire celebration
  remains visible without scrolling.
- Added a tactile shared-button close control, retained the explicit Awesome
  action, and added settings-aware purchase-success audio.
- Added the real production purchase celebration to `/ui-foundation` with fixed
  preview data and no balance, entitlement, ledger, or purchase mutation.

### 2026-08-03 — Oil Shop mobile hero and tab seam refined

- Widened the mobile hero copy region, reduced its smallest typography and
  tracking, and kept the three short labels intact instead of squeezing them
  into unnecessary line breaks.
- Removed the selected category tab's outline that produced a short vertical
  seam, retaining depth through its rounded surface, inset light, and outer glow.

### 2026-08-03 — Oil Shop active tab raised

- Rounded both upper edges of the selected category tab and added a subtle
  raised border, overlap, and glow so it sits visually above adjacent tabs.

### 2026-08-03 — Oil Shop category tabs and tactile details added

- Added accessible Hint Packs and Donations category tabs so the storefront can
  expand without restructuring; Donations currently shows a concise coming-soon
  state and performs no purchase or payment behavior.
- Increased the hint-quantity medallions' rim, lower edge, glow, and depth in
  both product rows and previews.
- Replaced the plain journey-home link with the shared tactile button treatment.

### 2026-08-03 — Mobile navbar divider restored

- Restored the subtle top border that separates mobile navigation from page
  content while retaining the opaque raised active tab that masks the divider.

### 2026-08-03 — Mobile navbar active-tab seam removed

- Removed the navbar's continuous top border and made the raised active tab
  opaque, preventing the bar edge from showing through the elevated control.
- Retained the surrounding shadow and amber active glow so the navbar still
  separates clearly from page content without a visible seam.

### 2026-08-03 — Shared mobile game navigation and shop overflow fix

- Added a shared five-tab mobile navbar for Home, Map, Vault, Shop, and Settings
  across protected player screens, with a raised glowing active state and safe-
  area-aware spacing. Active gameplay sessions intentionally remain distraction-
  free and continue using their explicit exit control.
- Associated waypoint routes with Map and Sanctuary routes with Vault so the
  mobile active state remains meaningful beyond each destination's root URL.
- Fixed narrow Oil Shop cards with shrink-safe grid columns, smaller responsive
  artwork, wrapping product names, and bounded price/action controls.
- Repositioned the shopkeeper hero on narrow screens so Luna and the live title
  remain visible without horizontal overflow.

### 2026-08-03 — Oil Shop game-art redesign implemented

- Rebuilt the shop from a generic card grid into a visual-first game store with
  compact illustrated product rows, tactile controls, a richer item preview,
  and a persistent learner-controlled purchase celebration.
- Added an identity-matched Luna shopkeeper hero plus dedicated Single Spark,
  Traveler Pack, and Lantern Pack artwork in the shared Scripture Memo palette.
- Added Luna to the successful-purchase moment with particles, spring entrances,
  the purchased item, granted hint quantity, and updated available balance.
- Preserved light/dark support, reduced copy, responsive mobile-first layout,
  accessible HTML labels, and the existing server-authoritative transaction.

### 2026-08-03 — Oil Shop hint balance label clarified

- Renamed “Hints ready” to “Hints available” so the shop clearly communicates
  the learner's current usable hint balance, including purchased entitlement.

### 2026-08-03 — Oil Shop stale development client diagnosed

- Confirmed the reported unknown `ShopItem.grantQuantity` field came from the
  already-running Next development process retaining the pre-migration Prisma
  runtime model.
- Verified the regenerated Prisma client contains the new shop and entitlement
  fields and the production build compiles the `/oil-shop` route successfully.
- No application query change was required; development must be restarted after
  schema generation so the server process loads the current Prisma client.

### 2026-08-03 — Phase 25 Oil Shop implemented

- Added the protected, private Oil Shop route with a visual-first hint-pack
  catalogue, prominent Glow and hint balances, item previews, purchase pending
  states, insufficient-balance feedback, loading skeleton, and journey-home link.
- Added 1-, 3-, and 5-hint products priced at 50, 125, and 200 Glow Points to
  the idempotent bootstrap catalogue.
- Added a server-authoritative purchase action and repository transaction that
  locks per learner, conditionally deducts the persisted balance, snapshots the
  entitlement, records the purchase, and inserts a negative immutable ledger row.
- Extended hint balances in gameplay, Vault, hint consumption, and the shop with
  purchased entitlement totals; added unit coverage for purchased hints.
- Applied the Oil Shop entitlement migration and regenerated Prisma Client.
  Phase 25 awaits project-owner manual acceptance.

### 2026-08-01 — Phase 24 accepted

- Recorded successful project-owner mobile testing of the Sanctuary and its
  study-access lifecycle.
- Marked Phase 24 complete and accepted; the project is ready to proceed to
  Phase 25, the Oil Shop.

### 2026-08-01 — Server-authoritative study lifecycle implemented

- Added one shared policy for the approved pre-study, active-practice lock, and
  permanent post-Radiance Sanctuary lifecycle.
- The waypoint page now shows the full preview and Study Verse before Glimmer,
  hides the verse after Glimmer starts, and restores Study Verse after Radiance.
- Direct Sanctuary URLs show a content-free locked state during practice;
  unauthorized verses remain indistinguishable Not Found responses.
- Vault cards suppress verse text, Sanctuary access, and replay while a later
  occurrence of that verse is active, including Recall, Strengthen, and Master.
- Added deterministic policy tests covering unlock, practice, cooldown,
  completion, later-stage precedence, and harmless locked future records.

### 2026-08-01 — Vault private-note indicator added

- Added a note icon to Vault verse cards when the authenticated learner has
  saved non-empty private Sanctuary text for that verse.
- Kept empty note records visually silent and derived the indicator only from
  the learner-scoped relation returned by the Vault repository.
- Confirmed completed verses remain alphabetically sorted pending the project
  owner's decision on switching to newest-completed-first ordering.

### 2026-08-01 — Missing Vault completed-verses shelf restored

- Fixed the Vault omission that exposed only fully mastered, favorite, and
  in-progress content even though completed waypoint history was already read.
- Added a Completed Verses shelf containing every verse with at least one
  completed waypoint and visible Journey Stage markers.
- Kept Vault replay restricted to verses with all four stages complete; every
  completed verse can enter its authorized Sanctuary.
- Included completed verses in Vault filters and pack/translation option data.

### 2026-08-01 — Phase 24 Sanctuary implemented

- Added the protected, private Sanctuary route for learner-completed verses with
  preferred-translation text, reflection, safe Markdown study notes, and a calm
  visual-first composition without game mechanics.
- Added validated, authenticated note-save and favorite-toggle actions backed
  exclusively by the Sanctuary repository. Every read and mutation proves the
  learner owns completed progress for the requested verse.
- Added private note editing with a 5,000-character server limit, explicit save,
  pending state, and Sonner feedback; favorite changes immediately revalidate
  both Sanctuary and Vault.
- Added Sanctuary entry from mastered and favorite Vault cards and changed the
  player-controlled Radiance milestone continuation to enter Sanctuary.
- Added a route-specific loading skeleton and private noindex metadata. No
  Prisma migration was required because both relation models already existed.
- Aligned product and roadmap wording with the approved post-Radiance entry and
  explicit `UserFavoriteVerse` relation. Phase 24 awaits manual acceptance.

### 2026-08-01 — Mobile button press feedback strengthened

- Increased shared button touch compression from `0.99` to `0.97` while
  retaining the 3px downward travel and compressed lower edge.
- Shortened touch-down transition timing and enabled manipulation-focused touch
  handling so mobile presses respond more immediately without relying on hover.
- Preserved reduced-motion behavior and left global sound/haptics for a future
  settings-aware feedback system.

### 2026-08-01 — Visual-first copy rule established

- Added a durable UI rule that Scripture Memo should communicate primarily
  through visuals, hierarchy, icons, motion, color, and concise labels.
- Player-facing paragraphs and repeated instructions must be minimized; prose
  remains only where it prevents confusion, communicates an important rule, or
  supports accessibility.

### 2026-08-01 — Badge reward count-up added

- Animated the persisted Glow Points earned value from zero to the awarded
  amount after the badge-unlock card settles.
- Kept the server-returned balance static so the animation cannot imply a
  client-side reward calculation or second balance update.
- Reduced-motion users receive the final reward value immediately.

### 2026-08-01 — Compact celebration sharing added

- Placed Continue and Share on one row in the streak celebration to shorten the
  mobile card while preserving Continue as the flexible primary action.
- Added the same compact Share action to badge-unlock celebrations.
- Extracted native-share and clipboard fallback behavior into a shared,
  touch-friendly achievement button with safe public copy and Sonner feedback.

### 2026-08-01 — Luna added to Mode Complete

- Replaced the Mode Complete check medallion with Luna's approved celebration
  pose and retained a spring entrance for the mascot.
- Kept all existing completion copy, rewards, audio, confetti, scroll locking,
  and player-controlled progression behavior unchanged.
- The live result remains directly replayable from `/ui-foundation`.

### 2026-08-01 — Celebration card springs slowed

- Reduced spring stiffness and increased perceived mass across the four
  completion and celebration card entrances so their overshoot and settling
  motion remains visible longer.
- Kept waypoint, Legendary badge, and new streak-level cards slightly heavier
  than ordinary mode and daily-streak celebrations.

### 2026-08-01 — Celebration cards given tactile spring entrances

- Strengthened the card-level entrance animation for mode completion, badge
  unlock, waypoint completion, and streak celebration screens.
- Replaced the badge card's tween entrance with a true spring and tuned stronger
  milestone screens with slightly more mass and bounce.
- Preserved every screen's existing content, audio, particles, rewards, and
  player-controlled dismissal behavior; Luna was not added.
- Retained immediate, movement-free presentation for reduced-motion users.

### 2026-08-01 — Luna reward-screen proposals rejected and removed

- Removed the review-only Luna comparisons for mode completion, badge unlock,
  waypoint completion, and streak celebration from `/ui-foundation`.
- Confirmed Luna will not be added to these four established celebration
  screens; their existing production designs remain unchanged.

### 2026-08-01 — Luna learning and guidance approved and promoted

- Promoted the approved Luna hint treatment into the self-closing hint modal
  while preserving its canonical verse content and progress timer.
- Turned challenge cooldown cards into a guided waiting state without changing
  server-authoritative unlock enforcement or the administrator override.
- Promoted one shared mode-ready treatment for timed and untimed Journey Stages;
  timed modes now state their exact limit and when the clock begins.
- Removed the approved comparison batch from `/ui-foundation`.

### 2026-08-01 — Luna learning and guidance comparisons added

- Added one review-only Learning & Guidance batch to `/ui-foundation` covering
  the existing hint modal, challenge cooldown, and mode-ready experience.
- Included Before/After comparisons only for surfaces that already exist.
- Consolidated the proposed timed-stage introduction into the existing
  mode-ready experience and added an Untimed/Timed preview control instead of
  inventing a duplicate screen.
- Left all live hint, waypoint, and gameplay components unchanged pending
  project-owner approval.

### 2026-08-01 — Luna timed-expiry recovery approved and promoted

- Replaced the generic post-expiry mode-ready state with the approved dedicated
  Luna recovery treatment.
- Client countdown expiry now identifies the expired mode, clears only that
  attempt, reassures the learner that completed modes remain saved, and starts a
  fresh server-timed attempt through the existing action on retry.
- Retained all incorrect-answer feedback unchanged and removed the approved
  gameplay recovery comparison from `/ui-foundation`.

### 2026-08-01 — Gameplay recovery audit and expiry comparison added

- Audited all five incorrect-answer flows and retained their current precise
  position feedback, error sound, and persistent count-specific toast; Luna is
  intentionally not proposed for every incorrect Check.
- Added a Before/After timed-attempt expiry comparison to `/ui-foundation`.
  The Luna candidate explicitly reassures learners that completed modes remain
  saved and offers a fresh attempt for the expired mode.
- Left the live expiry behavior unchanged pending project-owner approval.

### 2026-08-01 — Vault and Badge empty states approved and promoted

- Applied the Luna mascot empty state to genuinely empty Vault mastery,
  in-progress, and favorite sections while keeping filter-only misses restrained.
- Replaced the Badge Collection's custom filter-empty markup with the shared
  compact state and a working **Clear filters** action that resets status,
  category, and rarity together.
- Removed the approved Before/After empty-state comparison from
  `/ui-foundation`; the shared variants remain represented by their live uses.

### 2026-08-01 — Vault and Badge empty-state comparisons added

- Added backward-compatible `mascot` and `compact` variants to the shared
  `EmptyState` component; existing callers retain the unchanged default style.
- Added side-by-side Vault mastery-shelf and Badge filter-empty comparisons to
  `/ui-foundation`.
- Proposed Luna guidance for genuinely empty Vault content and a smaller shared
  recovery state with **Clear filters** for Badge filter results. Live Vault and
  Badge components remain unchanged pending project-owner approval.

### 2026-08-01 — Luna recoverable error approved and promoted

- Promoted the approved Luna retry treatment into the production `GlobalError`
  while preserving safe exception redaction and Next.js recovery behavior.
- Removed the previous generic error presentation and deleted the temporary Luna
  candidate.
- Simplified `/ui-foundation` to one preview of the live Luna error screen and
  removed the obsolete Before/After controls.

### 2026-08-01 — Luna error candidate copy simplified

- Replaced the recoverable-error candidate copy with **Oops we hit a snag** and
  **Luna could not load this. Try again.**
- Removed the additional eyebrow so the candidate retains only the requested
  message and recovery action.

### 2026-08-01 — Luna recoverable-error comparison added

- Added a full-screen **Before: current** preview of the exact live recoverable
  error boundary and a separate **After: with Luna** candidate in
  `/ui-foundation`.
- The Luna candidate preserves safe error redaction and the single retry action
  while adding the approved retry pose, shared game palette, and reduced-motion
  treatment.
- Left the production `GlobalError` component unchanged pending visual approval.

### 2026-08-01 — Luna loading screen approved and promoted

- Promoted the approved Luna loading treatment into the production
  `GlobalLoading` component used by root and protected route boundaries.
- Removed the previous flame-only loading implementation and deleted the
  temporary Luna comparison candidate.
- Simplified `/ui-foundation` back to one preview action showing the live Luna
  loading screen; the obsolete Before preview is no longer available.

### 2026-08-01 — Luna loading candidate simplified

- Restored the current loading screen's small rising ember particles in the Luna
  comparison candidate while retaining reduced-motion behavior.
- Removed the redundant Scripture Memo eyebrow and supporting sentence so Luna,
  the loading title, and trail progress remain the visual focus.

### 2026-08-01 — Luna UI integration previews started

- Added a shared typed `LunaMascot` component that restricts callers to approved
  poses, preserves intrinsic aspect ratios, and requires explicit decorative or
  meaningful accessibility treatment.
- Added the complete Luna production gallery to `/ui-foundation` without a
  redundant before-and-after state for the new asset family.
- Added separate **Before: current** and **After: with Luna** full-screen loading
  previews. The production `GlobalLoading` route remains unchanged until the
  Luna candidate receives project-owner approval.

### 2026-08-01 — Compact Luna notification portraits added

- Added square head-and-shoulders worried, disappointed, and angry/determined
  Luna portraits designed specifically for notification and widget scale.
- Preserved the existing full-body emotional poses for larger in-app surfaces
  and documented the correct compact-versus-full-body usage boundary.
- Corrected the urgent portrait framing so both ears remain within safe margins
  for circular and rounded-square masks.

### 2026-08-01 — Luna favicon and reminder expressions added

- Replaced the root application favicon with a close-up Luna portrait containing
  native 16, 32, 48, and 64-pixel frames.
- Added worried, disappointed, and angry/determined transparent Luna poses for
  escalating streak reminders, notifications, and future widgets.
- Documented an emotionally safe escalation model: caring warning, urgent
  determination, then compassionate reset acknowledgement without shaming the
  learner.

### 2026-08-01 — Luna mascot production set created

- Established Luna as Scripture Memo's upright sheep guide with cream wool,
  warm charcoal features, amber eyes, and a golden flame pendant.
- Added six transparent production poses for guidance, celebration,
  encouragement, loading, gentle retry feedback, and reward presentation.
- Preserved the chroma-key generation sources, added a documented local removal
  workflow, and recorded identity and usage rules beside the assets.

### 2026-08-01 — Phase 23 completed and accepted

- Marked Phase 23 Vault complete after project-owner acceptance of every
  currently reachable flow.
- Kept the mastered-verse replay manual test on the Phase 30 regression list;
  the missing four-stage mastered test fixture does not block Phase 24.

### 2026-08-01 — Unified game palette made authoritative

- Expanded the root visual-direction rules to require one shared semantic color
  system across all pages and features.
- Clarified that feature identity should come from composition, illustration,
  iconography, and restrained accents rather than unrelated page-level palettes.
- Required light and dark themes to remain recognizable variants of the same
  Scripture Memo game identity.

### 2026-08-01 — Vault hint balance made actionable

- Replaced the Vault's primary **Hints used** statistic with **Hints left**,
  derived from the same persisted hint usage and shared balance calculation used
  by gameplay.
- Kept lifetime hint usage as supporting context beneath the remaining balance.

### 2026-08-01 — Vault replay manual test deferred

- Added the complete Vault replay flow to the Phase 30 final regression
  checklist. It will be tested after a learner has mastered the same verse
  across Learn, Recall, Strengthen, and Master.
- The later check covers the five ordered Radiance-level modes, the absence of
  timers and hints, return navigation, isolation from campaign progression and
  rewards, and trusted Vault Explorer evaluation.

### 2026-07-28 — Phase 23 Vault implemented

- Added the private `/vault` archive with game-styled summary statistics,
  mastered verses, in-progress waypoints, favorites, badge navigation, filters,
  loading treatment, and section-specific empty states.
- Mastered verse reads and replay starts require the authenticated learner to
  have completed all four distinct Journey Stages for the same verse.
- Added server-created, server-validated Vault replay sessions using approved
  Radiance content, all five modes, no timer, and no hints.
- Isolated Vault completion from campaign progression, rewards, streaks,
  cooldowns, hints, and waypoint history. Only the completed replay record and
  trusted Vault Explorer badge evaluation persist.
- Activated Vault Explorer through a data migration and updated the seed
  synchronizer, product specification, roadmap, and security checklist.
- Applied migration `20260728210000_activate_vault_explorer_badge`.

### 2026-07-28 — Trail waypoint shadows removed

- Removed the dark pedestal crescents, oval ground-contact shadows, and lower
  inset shade from Map A waypoint nodes after visual review.
- Kept the waypoint control separate from shared buttons, using only its face
  gradient and scale-based hover/press response.

### 2026-07-28 — Trail waypoint controls separated and grounded

- Extracted Map A's interactive node into a dedicated
  `TrailWaypointButton`, independent of the shared application Button primitive.
- Replaced generic floating shadows with status-colored pedestal layers and
  soft oval ground-contact shadows so nodes appear to rise from the illustrated
  trail.
- Added face-only hover and press movement: pressing lowers the face toward its
  stationary pedestal while preserving the current node's progress treatment.

### 2026-07-28 — Gameplay menu runtime correction

- Wrapped both dropdown labels and their related items in the Base UI menu group
  context required by the installed component primitives.
- Replaced the gameplay header's hamburger icon with a compact vertical
  three-dot action control.

### 2026-07-28 — Gameplay mobile controls consolidated

- Kept the day and complete waypoint label together in the gameplay eyebrow,
  preventing the waypoint number from dropping onto a separate line.
- Replaced separate sound and exit icons with one accessible game menu containing
  labeled Sound and Exit gameplay actions.
- Replaced the wrapping collection of administrator replay buttons with one
  ordered replay selector. Active test replays now show only their mode name,
  no-progress assurance, and a focused Return to current mode action.

### 2026-07-28 — Puzzle phrase balancing revised

- Replaced variable 3–6-word Puzzle chunks with deterministic, balanced
  2–4-word chunks.
- Four- and five-word verses now yield two pieces, and verses of six or more
  words target at least three without creating one-word fragments.
- Glimmer now hides at least two pieces, Glow at least three, and Radiance all
  available pieces, with safe clamping for exceptionally short verses.
- Updated gameplay tests, the product specification, and the Phase 15 roadmap
  record to make the revised behavior authoritative.

### 2026-07-28 — Interactive sentence spacing hardened

- Added explicit horizontal and vertical margins around every interactive token
  in Fill, Swap, Cue, and Drag & Drop sentence flows.
- Consecutive blanks and movable words now retain separation when adjacent and
  when wrapping onto a new line, without breaking the verse's sentence layout.

### 2026-07-28 — Drag overflow corrected

- Stopped translating the original bank tile while its dedicated drag overlay
  follows the pointer.
- This prevents transformed source tiles from expanding the word or phrase
  bank's scrollable overflow area and exposing scrollbars during dragging.
- The original tile remains dimmed in place until the drag ends, preserving a
  clear indication of where the game piece came from.

### 2026-07-28 — Draggable tile depth simplified

- Removed every inset and displaced shadow, including the remaining light bevel
  strip, from selected, unselected, and pointer-following word-bank pieces.
- Retained only scale-based Z-axis hover and press movement; selection is now
  communicated solely through color and border changes.

**Last updated:** 2026-07-28
**Purpose:** Concise continuity backup and current-status summary for Codex
development sessions.

This log supplements normal Codex conversation history; it does not replace it.
When conversation history is available, use that history for detailed context
and reasoning, then use this log to confirm the latest completed work, decisions,
blockers, current task, and next step.

The current codebase and Git state are the final authority. Root `AGENTS.md`
governs implementation rules, while `docs/PRODUCT-OVERVIEW.md` and
`docs/ROADMAP.md` govern current product scope and implementation sequence. If
this log or conversation history disagrees with those sources, follow the
authoritative repository sources and correct this log.

## Project Summary

Scripture Memo is a full-stack, mobile-first scripture memorization web
application built with Next.js 16.2.10, strict TypeScript, Prisma 7, PostgreSQL,
Better Auth, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod, and Sonner.

Players progress through an expanding sequential waypoint curriculum
bootstrapped with 220 records. Every waypoint combines a Three-Day Challenge
(Glimmer, Glow, Radiance) with five ordered game modes (Drag & Drop, Puzzle,
Swap, Cue, Fill). Journey Stages (Learn, Recall, Strengthen, Master) control
long-term verse difficulty. Glow Points are the only currency.

## Current Project State

- Branch: `badge-system`.
- Current committed HEAD at this update: `4cebadf`.
- Phases 0–9 are complete and manually accepted, including bulk CSV import,
  dynamic verse-list search, and admin pack management.
- The public landing page and internal UI-foundation preview are implemented.
- Better Auth registration, login, logout, onboarding, and protected-route flows
  are implemented and accepted.
- The complete product-aware Prisma schema and migrations are present and were
  applied successfully during Phase 3.
- Root `AGENTS.md` is the single authoritative agent instruction file;
  `docs/AGENTS.md` was removed.
- Phase 9 waypoint management, curriculum-history hardening, and Phase 9A's
  application-wide error reference are merged at the current HEAD.
- Phase 10 progression engine is complete with lazy initialization,
  server-authoritative cooldowns, atomic advancement, and real PostgreSQL tests.
- Phase 11 Game Map, shared responsive trail coordinates, and Trail Navigator
  are implemented and have passed automated and project-owner manual acceptance.
- Phase 12 Day Selection is complete and manually accepted, with server-derived
  states, live cooldowns, and atomic session starts.
- Phase 13 Gameplay Shared Engine is complete and manually accepted with the reusable gameplay
  shell, deterministic generators, server-owned ordered attempts, stage-based
  limits, and atomic final-mode/day completion.
- Phase 14 Drag & Drop Mode is complete and manually accepted, including
  desktop/touch placement, feedback audio, victory variants, the completion
  interstitial, Exit navigation, and administrator Test Replay.
- Phase 15 Puzzle Mode is complete and manually accepted.
- Phase 16 Swap Mode is complete and manually accepted.
- Phase 17 Cue Mode is complete and manually accepted.
- Phase 18 Fill Mode is complete and manually accepted.
- Completed-day administrator Test Replay entry and audited self-testing
  cooldown overrides are implemented.
- Phase 19 Glow Points and Rewards is complete and manually accepted.
- Phase 20 Hint System is complete and manually accepted. The longer
  Strengthen/Master end-to-end progression scenario is recorded for the final
  regression pass; both UI omission and server-side rejection are implemented.
- Phase 21 Streak System is complete and manually accepted. A natural
  next-calendar-day increment remains recorded for the final regression pass.
- Phase 22 Badge System is complete and manually accepted. The SUPER_ADMIN
  manual-award flow remains recorded for later testing when a second account is
  available.

## Current Roadmap Position

Phases 0–22 are complete and manually accepted.
Phase 23 — Vault is next.

## Completed Work

### Phase 0 — Requirements Lock

- Product, architecture, progression, and security requirements reviewed.
- Next.js 16.2.10 and installed package documentation established as the
  framework authority.

### Phase 1 — Project Bootstrap

- Next.js App Router, strict TypeScript, Tailwind CSS 4, shadcn/ui, required
  dependencies, root route states, Sonner, aliases, and root-based structure.

### Phase 2 — Global UI Foundation

- Required shadcn primitives and shared UI components.
- Data-table building blocks.
- Protected-route loading and error boundaries.
- Light, dark, and system theme support.
- `/ui-foundation` verification page and product-branded public landing page.
- Tailwind CSS 4 canonical utility syntax policy.

### Phase 3 — Database and Prisma Setup

- Prisma 7 PostgreSQL configuration and server-only singleton.
- Better Auth identity tables preserved.
- All domain enums and product models implemented.
- Notes, favorites, account suspension, and non-rewarding Vault replay support.
- Critical relations, indexes, idempotency keys, reward ledger, and duplicate
  completion/badge constraints.
- Migration `20260712014802_complete_product_schema` created and applied.
- Prisma format, validation, client generation, TypeScript, ESLint, generated
  migration inspection, and production build passed.

### Phase 4 — Core Libraries

- Added the generic `ActionResult` discriminated union and an auth-owned action
  demonstrating the contract without implementing Phase 5 early.
- Added UTC-safe date helpers, permission guards, secret-redacting server logs,
  a process-local fixed-window rate limiter, and gameplay constants.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting Glow Points balance for new users.
- TypeScript, ESLint, diff validation, direct date and permission checks, Prisma
  generation, and the production build passed.

## Current Task

Begin Phase 23 — Vault.

## Exact Next Task

Inspect the Phase 23 Vault requirements and current replay infrastructure, then
implement the private progress archive and mastered-verse replay flow.

## Important Decisions

- Scripture Memo is fundamentally a game, not a regular web application.
  Player-facing screens, pages, transitions, controls, feedback, audio, and
  celebrations must feel intentionally game-like, immersive, tactile, and
  mobile-first rather than resembling a generic dashboard. This is a continuing
  design requirement for every remaining phase.
- Shared buttons use a consistent tactile interaction language: subtle hover
  lift and depth, visible press-down translation and compression, still disabled
  states, clear keyboard focus, and transform-free reduced-motion behavior.
- Standard buttons now render as weighted game controls with a persistent
  four-pixel lower edge and ambient shadow. Hover increases the perceived depth;
  pressing moves the face downward and collapses the edge to one pixel. Ghost
  and link treatments remain intentionally lighter.
- Dark-theme weighted buttons use a subtle light lower rim above a stronger
  dark ambient shadow, preserving the same obvious physical depth visible
  against light surfaces without flattening into the dark background.
- Replaced the generic global/protected route spinner with a theme-aware game
  transition: the animated Scripture Memo flame, ambient embers, a tactile
  trail-progress card, game-world loading language, and complete reduced-motion
  behavior. Feature-specific layout skeletons remain in place where useful.
- Added an exact full-screen loading-transition launcher to `/ui-foundation`.
  It supports repeated visual testing without network throttling, locks
  background scrolling, and remains visible until the tester closes it.
- Word-bank and Puzzle phrase-bank draggable pieces now use a shared top-bevel
  treatment rather than button-style lower extrusion. Inset highlights, lower
  face shading, ambient lift, selected amber bevels, and raised drag overlays
  preserve physical weight in both themes and reduced-motion mode.
- Refined draggable bevel color after visual review: removed the contrasting
  white highlight and derived each depth layer from a darker shade of the
  piece's own violet or selected amber surface.
- Reworked only the unselected draggable treatment after further review. Its
  depth is now a dark four-sided inset bevel contained within the tile face,
  with a centered ambient halo and scale-based Z-axis hover response rather
  than a light layer displaced below it. The accepted amber selected treatment
  remains unchanged.
- Player-accessible replay from completed map challenge cards is deferred to
  Post-Roadmap Extras. It will use individual mode selection, remain
  non-progressing and reward-free by default, and coexist with organized Vault
  replay. Any limited practice reward requires a separate abuse-resistant
  product decision.
- Root `AGENTS.md` overrides supporting documents when instructions conflict.
- Available Codex conversation history remains useful and should be read when
  present; this file is only a continuity backup and status summary.
- Repository state, Git state, root `AGENTS.md`, `PRODUCT-OVERVIEW.md`, and
  `ROADMAP.md` outrank both chat history and this log.
- Agents must not rely on chat history alone.
- Changes should remain uncommitted for review in VS Code Source Control unless
  the project owner explicitly asks Codex to commit or push.
- Bulk verse imports skip and report existing or repeated references; they never
  update existing verses. Imports are limited to 100 rows and 1 MB per file.
- Long predefined dropdowns use searchable comboboxes; short lists such as
  status, sort, theme, and translation remain simple selects.
- Every manual verse mutation and bulk import writes an actor-linked `AuditLog`
  record in the same transaction. Update metadata contains changed field names,
  never translation text, reflections, or study-note content.
- Packs start hidden, require at least one published verse before publishing,
  and automatically hide when their final verse is removed.
- Pack ordering uses one-based `PackVerse.position` values and supports pointer,
  touch, keyboard, and explicit arrow-button reordering.
- All 220 waypoint placeholders start hidden and unassigned with provisional
  `LEARN` stage. Assignment requires an explicit stage, and publishing requires
  an assigned, currently published verse.
- The initial 220 waypoints are a bootstrap count, not a maximum. Administrators
  append individual waypoints to one continuous historical sequence without
  year grouping.
- Published waypoints form a continuous prefix. Per verse, Learn, Recall, and
  Strengthen are unique and ordered; Master may repeat.
- Published but unstarted waypoint assignments must be hidden before editing.
  Any learner-linked history permanently locks waypoint ordering, assignment,
  Journey Stage, and visibility; there is no routine override.
- Published waypoint dependencies prevent verse archival. Once learner history
  exists for a verse's waypoint, the verse content is immutable so historical
  gameplay remains reproducible.
- Curriculum topology writes use one shared transaction-scoped PostgreSQL
  advisory lock. Assignment, publication, archival, and content edits also use
  stable per-verse locks so validation cannot race a conflicting mutation.
- Phase 10 creates progress lazily, unlocks the next actually published waypoint
  by database query, and commits completion plus unlocking atomically.
- The learner map uses an original mobile-first winding trail with tactile
  circular nodes. Its three ring segments map exactly to the three completed
  challenge days; decorative presentation must never inflate real progress.
- Every current and future Map A trail illustration uses the shared positions
  `(50,10)`, `(35,30)`, `(65,50)`, `(40,70)`, and `(60,90)` for both mobile and
  large layouts unless the project owner explicitly approves an exception.
- Map A uses a full-height right-side Trail Navigator at every breakpoint. It
  labels groups sequentially as `Trail N`, lists every published trail including
  locked future groups, and permits jumps only to groups with accessible
  waypoints. Custom trail names are intentionally deferred.
- Map A's bottom-right viewport controls are icon-only: one opens the navigator
  and one returns the learner to the current trail after distant scrolling.
- Map A nodes show only their waypoint control and flame progress. Map B restores
  the earlier Scripture reference and Journey Stage preview; Day Selection still
  owns the authoritative full details for both.
- Pre-launch map comparison uses Map A (winding trail) and Map B (original card
  grid) over one shared data and navigation controller. Tester preference is
  browser-local, URL assignment takes precedence, and neither affects progress.
- Automated destructive database tests use only the separately provisioned
  `scripture-memo-integration-tests` Prisma Postgres resource. `DATABASE_URL`
  remains protected, test configuration fails closed, and Prisma MCP write
  operations require explicit project-owner approval.
- Complex operational failures use stable feature codes from one structured
  catalogue. Sonner shows only the short safe message and code; the ADMIN-only
  reference page renders detailed safe guidance. Ordinary validation stays
  uncoded, and codes identify conditions rather than individual occurrences.
- The error reference is application-wide even though its first entries cover
  Waypoints and Verses. Its permanent link belongs on the future admin front
  page, not on either feature's management page.
- The Phase 4 placeholder Server Action using `ActionResult` belongs to the auth
  feature because authentication is the next feature that will consume the
  shared contract.
- `DEFAULT_HINT_ALLOWANCE = 5`.
- `BASE_GLOW_POINTS = 100` controls the Glimmer earning rate. New users start
  with 0 Glow Points.
- The Phase 4 rate limiter is process-local. Production authentication requires
  a distributed provider shared by every application instance.
- Better Auth's public API uses its database-backed rate limiter. Server Action
  calls use the application limiter because Better Auth excludes internal
  `auth.api` calls from its own request limiter.
- Email verification and password reset are deferred until an email delivery
  provider is selected; neither is required by the Phase 5 roadmap acceptance
  criteria.
- No `src/` directory; application code uses root-based, feature-owned folders.
- Route pages are one-line feature-view re-exports.
- Prisma access is repository-only, except singleton definition and Better Auth
  adapter initialization.
- Server Actions are the default mutation boundary and must validate, authenticate,
  authorize, call repositories, and revalidate.
- Durable application data belongs in PostgreSQL through Prisma, not JSON files.
- Mode 4 is Cue, never Hint; hints are a separate system.
- Timed Journey Stages use one server-authoritative deadline per mode attempt:
  Recall 5 minutes, Strengthen 3 minutes, and Master 2 minutes. Expiry permits a
  fresh retry of that mode without erasing completed modes or awarding progress.
- Hints are disabled during Strengthen and Master.
- Cooldowns, game order, completion, and rewards are server-authoritative.
- Glow Points are the only currency; no XP system exists.
- Reward balance changes require a transaction and immutable ledger entry.
- The database schema includes private notes, favorites, suspension state, and
  explicit Vault replay classification.

## Recent Important File Changes

- `features/map/`: Phase 11 batch repository read, map-state helpers and tests,
  ten-node navigator, waypoint cards, skeleton, protected view composition, and
  extensive intent-focused inline documentation across the complete feature.
- `features/map/components/map-positioner.tsx`, related pure helpers/tests, and
  `/map-positioner`: a browser-local, development-only PNG alignment tool that
  exports ten responsive percentage coordinates without persistence or uploads.
- `public/images/maps/` and `features/map/data/map-themes.ts`: three repeating
  owner-supplied Map A backgrounds with separate five-point mobile and
  large-screen alignment metadata.
- `components/shared/journey-stage-badge.tsx` and
  `components/shared/flame-indicator.tsx`: reusable learner-facing progression
  indicators for the map and upcoming Day Selection screen.
- `app/(protected)/game/map/`: one-line page and loading re-exports.
- `features/auth/views/authenticated-home-placeholder-view.tsx`: discoverable
  link to the new map while the later Game Home phase remains pending.
- `AGENTS.md`: consolidated all agent instructions at the repository root; added
  authority, JSON persistence, and project-continuity rules.
- `docs/AGENTS.md`: deleted after consolidation into root `AGENTS.md`.
- `prisma/schema.prisma`: expanded into the complete product-aware schema.
- `lib/prisma.ts`: hardened Prisma 7 singleton with server-only protection and
  explicit environment validation.
- `prisma/migrations/20260712014802_complete_product_schema/migration.sql`:
  created and applied for the complete schema.
- `docs/PRODUCT-OVERVIEW.md` and `docs/ROADMAP.md`: reconciled schema models and
  index requirements.
- `features/landing/views/landing-view.tsx`: public landing page and canonical
  Tailwind gradient syntax.
- `docs/codex-history/CODEX_SESSION_2026-07-11_RECOVERED.md`: recovered historical
  transcript retained as an archive, not as an authoritative status source.
- `types/api.ts`: standard Server Action result contract.
- The temporary auth foundation action was removed after real auth actions adopted
  the shared `ActionResult` contract.
- `lib/dates.ts`, `lib/permissions.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, and
  `lib/constants.ts`: Phase 4 core libraries.
- `docs/PRODUCT-OVERVIEW.md`: records the five-hint default, 100-point base
  reward, and zero starting balance.
- `features/users/` and `features/settings/`: Phase 6 profile reads, preference
  persistence, settings UI, and authenticated preference synchronization.
- `app/(protected)/settings/page.tsx`: one-line protected settings route.
- `features/auth/`: registration, login, logout, translation onboarding, forms,
  repositories, schemas, and views.
- `lib/auth/session.ts`: authoritative server session helpers.
- `proxy.ts`: protected-route and admin navigation guards.
- `prisma/migrations/20260712032838_add_auth_rate_limit/migration.sql`:
  Better Auth database-backed rate-limit storage.
- `features/verses/components/markdown-editor.tsx`: accessible Markdown study-note
  editor with formatting controls, undo/redo, character count, and a safe preview
  that ignores embedded HTML.

## Outstanding Tasks

- Commit and merge the manually accepted Phase 22 changes.
- Select an email delivery provider before implementing verification or password
  reset.
- Phases 23–32 remain pending in roadmap order.
- `.env.example` remains absent and is required by the security checklist.
- Before upgrading to `pg` 9, update the configured database SSL mode explicitly
  to `verify-full` to preserve the current certificate-verification behavior.

## Blockers and Unresolved Questions

- No implementation blocker exists. The dedicated test database is configured,
  migrated, and verified; both repository integration suites pass and clean up
  their fixtures.
- No email delivery provider has been selected, so verification and password
  reset are intentionally not implemented.
- The recovered transcript contains historical references to the deleted
  `docs/AGENTS.md`. They are intentionally preserved because the file is an
  archive of what occurred, not a live instruction source.

## Dated Session Updates

### 2026-07-28 — Phase 22 accepted

- The project owner confirmed all currently available badge-system manual tests
  pass.
- Phase 22 is complete. The only deferred check is SUPER_ADMIN manual awarding,
  which requires a second test account and remains recorded for the final
  regression pass.
- Phase 23 — Vault is next.

### 2026-07-28 — Phase 22 Badge System implemented

- Added and applied migrations
  `20260728170000_add_badge_criteria_key` and
  `20260728173000_drop_badge_criteria_default`, then synchronized all 27
  documented badge definitions without replacing learner progress.
- Approved rarity rewards are Common 50, Uncommon 100, Rare 200, Epic 350, and
  Legendary 500 Glow Points. Streak badges use the approved Spark through
  Eternal Light level names and thresholds.
- Added server-derived, event-driven badge progress evaluation inside the
  existing gameplay transaction. Per-user advisory locking, the unique progress
  constraint, and reward-ledger idempotency prevent duplicate unlock rewards.
- Assistance-free, accuracy, Journey Stage, timed-stage, mastered-verse, and
  streak progress are derived from persisted history. Later-feature Vault,
  Fellowship, and Leaderboard criteria are seeded but dormant until their
  trusted events are implemented.
- Added queued Common-through-Legendary unlock celebrations with confetti,
  synthesized badge audio, Glow reward/balance display, reduced-motion support,
  scroll locking, and explicit player-controlled dismissal.
- Added the private `/vault/badges` collection with status, category, and rarity
  filters, progress, dates, rewards, and repository-level secret-badge masking.
- Added `/admin/badges` availability controls plus SUPER_ADMIN-only, audited,
  idempotent manual awards. Administrators can create and edit definitions
  against controlled criteria, see unlock counts, and cannot activate criteria
  whose trusted events belong to later roadmap phases.
- Paused badges no longer receive progress or unlocks, but previously earned
  instances remain visible permanently in their owners' collections. Future
  feature definitions were explicitly paused by migration
  `20260728190000_pause_future_badge_criteria`.
- Added all five rarity unlock previews to `/ui-foundation`.
- Added accessible administration tooltips for Target, criterion, category,
  rarity, and reward. Target is explicitly defined as the server metric value
  required before the badge unlocks.
- Corrected opaque badge editor validation feedback. Persisted definitions were
  verified against the schema, client and server validation remain aligned, and
  the editor now shows an accessible inline summary, field names, specific
  correction messages, and invalid-field borders instead of only “Review the
  badge details.”
- New administrator-created badges now start paused by default. Added immediate
  badge-management search across name, description, category, rarity, and
  criterion, including result count and an empty-search state.
- Added confirmed badge deletion: administrators may delete only when zero
  players have unlocked the badge. Partial progress is removed atomically, the
  deletion is audited, and earned badges remain permanently undeletable.
- Corrected mobile badge-management card overflow. Action controls use a
  two-column small-screen grid with Delete on its own row, then return to a
  three-control layout at wider breakpoints, preserving equal outer margins.
- Prisma validation/generation, TypeScript, ESLint, badge tests, gameplay tests,
  streak tests, database migration/seed, and the production build passed.
- Project-owner manual acceptance passed, including the expanded five-rarity
  preview, badge collection, responsive management cards, controlled
  create/edit, search, pause, and deletion flows.
- The SUPER_ADMIN manual-award flow remains deferred until a second test account
  exists; its validation, authorization, idempotency, transaction, and audit
  protections passed automated verification.

### 2026-07-28 — Phase 21 Streak System implemented

- Resolved the supporting-document trigger conflict with project-owner approval:
  the first server-verified mode completion on a learner-local day counts as
  meaningful streak activity; completing all five modes is not required.
- Added pure timezone-aware calendar arithmetic with an invalid-zone UTC
  fallback. Local year/month/day parts are compared independently of elapsed
  hours so daylight-saving transitions cannot create false gaps.
- Added a transaction-aware streak repository with a per-user PostgreSQL
  advisory lock, same-day idempotency, consecutive-day increments, missed-day
  reset to one, and permanent best-streak retention.
- Integrated streak updates directly after a correct persisted mode attempt,
  inside the existing gameplay transaction. Failed, expired, and Admin Test
  Replay attempts cannot alter streaks.
- Added a validated IANA timezone preference to learner settings, applied the
  additive `20260728120000_add_user_timezone` migration, and regenerated Prisma
  Client. Existing learners safely default to UTC.
- Added a game-style streak pill to Game Home. Profile & Settings continues to
  show current and best streak values; Vault integration remains assigned to
  the Vault roadmap phase.
- Added focused unit coverage for first activity, same-day replay, consecutive
  days, missed-day reset, best retention, timezone boundaries, invalid-zone
  fallback, and learner-facing display text.
- Replaced the oversized timezone combobox after manual testing showed that its
  trigger scrolled without presenting a usable popup. The authenticated shell
  now detects and persists the browser timezone once, refreshes the active view,
  and Settings exposes a native searchable timezone override. A dedicated
  configuration flag prevents another device from overwriting either the
  detected value or a deliberate manual choice.
- Manual acceptance passed for timezone detection and override, first-day
  streak creation, same-day idempotency, and streak displays. The project owner
  will observe the natural next-day increment later; the equivalent consecutive
  local-day behavior already passes deterministic automated coverage.
- Reversed the combined mode/streak completion treatment after project-owner
  review. Standard mode success now remains unchanged and is followed, only
  when applicable, by a separate learner-controlled Streak Complete screen.
  The dedicated milestone has space for the animated flame, current count,
  new-best feedback, and a Share action using the native share sheet with a
  clipboard fallback.
- Sequenced all five modes as standard success → optional streak milestone →
  normal mode/day/waypoint continuation. Admin Test Replay and unchanged
  same-day streaks skip the new screen.
- Added independent repeatable Mode Completion and Streak Celebration previews
  to `/ui-foundation`, both backed by their production components and fixed
  display-only data.
- Added the approved named streak ladder: Spark, Kindling, Steady Flame,
  Beacon, Blaze, Inferno, Supernova, and Eternal Light. Threshold crossings use
  a larger multi-stage flame surge, three expanding ember rings, and a springing
  level medallion; ordinary daily streaks retain the calmer motion.
- Reworked the seven-day strip to match the project owner's intended forecast:
  it begins at the current streak day, projects the next six learner-local
  dates, marks an in-range level threshold, and always shows the exact days
  remaining and projected date for the next named level. The copy explicitly
  conditions the projection on keeping the streak alive.
- Added a low-volume synthesized flame ambience with filtered burn noise and
  intermittent crackles. It obeys the persisted audio preference, needs no
  unlicensed sample, and tears down its Web Audio graph when the screen closes.
  Reset celebrations continue to show the preserved previous best and a
  fresh-start message instead of the new-best card.
- Expanded `/ui-foundation` streak controls to preview Daily, New level, and
  Reset states independently. Glow Point rewards for streak milestones remain
  assigned to Phase 22 badge awards rather than this display layer.
- Corrected the New Level flame surge after browser testing exposed Motion's
  two-keyframe limit for spring animations. The five-stage overshoot now uses a
  timed keyframe transition with matched scale/rotation frames, preserving the
  approved weighted surge without a runtime exception.
- Refined the next-level forecast markers after visual review. Today's active
  streak now uses the custom flame SVG held static with no circular badge; the
  target uses the standard flame glyph without the former yellow circle/star.
  When a target is more than six days away, the seventh tile jumps to that
  projected local date so the next-level flame is always visible.
- Sequenced Streak Complete audio so its success cue plays immediately on
  entrance and the burning-flame ambience starts 1.3 seconds later. Closing the
  screen during that interval cancels the delayed ambience, and both treatments
  continue to respect the learner's audio preference.
- The project owner manually accepted the complete expanded streak experience:
  Daily, New Level, and Reset variants; named-level animation; forward calendar
  and always-visible target flame; previous-best reset messaging; sharing; and
  the ordered success/ambience audio treatment. Only the natural next-day
  increment remains deferred to the final regression pass.

### 2026-07-27 — Phase 20 Hint System implemented

- Added a five-hint free balance derived from persisted `HintUsage` records.
- Added a validated authenticated action and transaction-locked repository
  consumption flow that rechecks session ownership, active state, Journey
  Stage, current mode, canonical translation, and remaining balance.
- Successful consumption creates `HintUsage` and increments
  `UserProfile.totalHintsUsed` atomically before revealing the verse.
- Added the shared Hint button, accurate remaining-count feedback, and a calm
  full-verse modal. Strengthen/Master sessions render no hint control, and
  the modal now shows a six-second progress bar before closing itself.
- Normal admin campaign play consumes real hints for end-to-end verification;
  Admin Test Replay exposes unlimited non-persisting **Test hint** access.
- Purchased hint credit is deliberately deferred to Phase 22 because the
  current generic shop schema does not yet define hint quantities.
- Hint balance tests, ESLint, strict TypeScript, and the production build pass.
- Corrected the shared mode-completion overlay to lock background document
  scrolling while open. Only the overlay scrolls when its card exceeds the
  viewport, eliminating the duplicate scrollbar and preventing hidden gameplay
  content from moving behind the success screen.
- Added the distinct Radiance-only Waypoint Complete milestone after the normal
  day-reward screen. It animates three flames, shows the completed waypoint and
  verse plus the server-returned next-waypoint/caught-up result, plays a
  dedicated fanfare, locks background scrolling, and returns to the trail map
  only after the learner presses Continue.
- Added a reusable **Preview Waypoint Complete** control to `/ui-foundation`.
  It opens the real production milestone with fixed display-only sample data,
  plays its fanfare, changes no database or game state, and can be repeated
  indefinitely for visual and audio acceptance testing.
- Smoothed the three-flame mobile entrance by replacing three concurrent spring
  animations with one short GPU-friendly group transition. The milestone now
  shows the persisted rewards earned for that waypoint and the learner's total
  Glow Point balance; the UI Foundation preview reflects both values.
- Refined the approved milestone sequence: after the screen enters, each flame
  pops in separately with small particles and synchronized interaction audio,
  then Waypoint Rewards drops into position followed by Total Balance. The
  sequence uses short transform-only tweens for mobile smoothness and removes
  staged movement and particles when reduced motion is enabled.
- Increased the flame stagger to roughly half a second between arrivals and
  delayed both Glow Point cards until the third flame finishes, making each
  milestone beat easier to perceive.
- Replaced the Glow Point cards' top-edge drop with a depth-based release. Each
  card now begins close to the camera on the positive Z-axis, moves away through
  a perspective scene, and settles with a small downward motion and subtle
  three-dimensional rotation. Waypoint Rewards lands before Total Balance;
  reduced-motion behavior remains immediate.
- Increased the cards' initial face tilt and opposing rotational angles, with a
  slightly stronger counter-rotation before both settle flat on the board.
- Added a weighted landing phase to both cards: accelerating depth movement,
  contact compression, downward overshoot, short rebound, and synchronized
  impact audio now replace the previous floaty single-ease settlement.
- After Total Balance lands, its number now begins at the persisted waypoint
  reward total, counts to the learner's persisted overall balance, and performs
  one enlarge-and-settle pulse. Values use localized thousands separators;
  reduced-motion mode shows the final value immediately.
- Added a half-second pause between the Total Balance card settling and its
  count-up, then changed the final-value emphasis to three enlarge-and-settle
  pulses.
- Moved the waypoint-complete fanfare to the start of the milestone entrance so
  it is always the first sound, before the individual flame and card-impact
  cues.
- Used the supplied 16-frame fire GIF as the visual reference, then replaced
  the interim raster treatment with a purpose-built transparent animated SVG.
  Its traced outer and inner silhouettes morph on offset loops with gradient
  colour and a restrained glow; reduced-motion users see the same vector flame
  held on its resting shape.
- Accelerated the vector flame while deliberately making the outer silhouette
  flicker faster than the inner flame, then added two offset upward ember
  trajectories. The original reference GIF remains in the project as a retained
  asset for future use, but the milestone continues to render the SVG.

### 2026-07-26 — Phase 19 Glow Points and Rewards implemented

- Added server-owned Glimmer, Glow, and Radiance reward calculations of 100,
  150, and 200 Glow Points.
- Added a rewards repository with balance and bounded newest-first immutable
  history reads.
- Integrated the ledger insert and atomic profile increment directly into the
  existing server-proven fifth-mode/day/session completion transaction.
- Added a unique learner/waypoint/day idempotency identity so a repeated award
  cannot create another ledger event or balance increment.
- Completion feedback now displays only the persisted earned amount and new
  balance returned by the transaction.
- Reward calculation and identity tests, the 26 gameplay regression tests,
  ESLint, strict TypeScript, and the production build pass.
  The new PostgreSQL integration test was invoked, but the configured test
  database rejected user fixture creation before exercising reward writes,
  consistent with the existing test-database availability issue.
- Project-owner manual acceptance passed by completing Glow: the completion
  screen displayed the expected +150 Glow Points, a persisted balance of 150,
  and remained open for the explicit Continue action. Phase 19 is complete.

### 2026-07-26 — Puzzle short-verse difficulty correction

- Diagnosed the one-tile Glow Puzzle: the standard 3–6-word phrase rule turned
  every verse of six words or fewer into one phrase, so percentage scaling
  could not make later days more demanding.
- Added the approved deterministic short-verse exception. Glimmer creates up to
  two chunks and moves one; Glow creates up to three chunks and moves at least
  two; Radiance moves all available chunks.
- Longer verses retain the established 3–6-word phrase generator and normal
  hidden-percentage ranges.
- Added tests for the exact five-word test verse, day-specific phrase
  boundaries, deterministic output, and Glow/Radiance minimum bank sizes. All
  26 gameplay tests, ESLint, strict TypeScript, and the production build pass.
- Corrected the Puzzle verse presentation after project-owner review: visible
  phrases and interactive blanks now remain inline as one naturally wrapping
  sentence. The former separate numbered phrase rows were removed; chunking and
  day difficulty behavior are unchanged.

### 2026-07-26 — Completed-day replay entry and cooldown testing override

- Confirmed the documented replay boundary: ordinary campaign days remain
  complete, later learner replay belongs to the Vault, and administrators may
  use clearly labeled non-progressing Test Replay for completed modes.
- Added an administrator-only **Test replay [day]** action to completed
  challenge cards. It opens the learner-owned completed session and reuses the
  existing mode-by-mode Test Replay controls without creating attempts or
  changing progression, rewards, or cooldowns.
- Added an administrator-only **Unlock for testing** control beside active Glow
  and Radiance cooldowns.
- Added a validated and independently authorized Server Action. The repository
  can alter only the authenticated administrator's own pending day, locks the
  progression transaction, rechecks publication, ordering, completion, and the
  live server timestamp, and atomically records the privileged override in
  `AuditLog`.
- Day-selection and progression utility tests, ESLint, strict TypeScript, and
  the production build pass. The first sandboxed build could not download the
  configured Google fonts; the approved network-enabled rerun passed.

### 2026-07-26 — Phase 18 Fill Mode implemented

- Resolved the roadmap overlap with project-owner approval: Phase 18 owns Fill
  and the existing atomic day/cooldown/waypoint transition. Glow Points remain
  Phase 19, badges Phase 24, and streaks Phase 25; Fill makes no premature claim
  about those outcomes.
- Extracted exact-length typed-word sanitization into the shared answer
  validator so Cue and Fill handle typing, paste, autofill, case, and canonical
  punctuation consistently.
- Added deterministic unassisted Fill blanks across Glimmer, Glow, and Radiance,
  with blue focus treatment, exact-length auto-advance, Reset, and per-position
  green/red Check feedback.
- Added focused tests for normalized Fill validation, pasted extra-character
  clamping, incomplete positions, and punctuation reconstruction.
- Connected correct Fill answers to the authenticated fifth-mode completion
  action. The existing session-locked transaction completes the day, schedules
  the next cooldown, or completes Day 3 and unlocks the next published waypoint.
- Added accurate day/cooldown/waypoint toasts, randomized victory audio,
  confetti, the explicit completion interstitial, and Continue navigation back
  to Day Selection.
- Extended administrator Test Replay to completed Fill modes without attempts or
  progression writes.
- All 24 gameplay tests, three progression utility tests, the database safety
  guard, gameplay ESLint, strict TypeScript, diff validation, and the production
  build pass. The existing PostgreSQL progression integration suite was also
  invoked but its configured test database failed on the initial
  `waypoint.count()` before exercising Fill; no schema or database code changed
  in this phase. Manual browser acceptance remains pending.

### 2026-07-26 — Phase 17 Cue Mode completed and accepted

- Added deterministic first-letter Cue positions across the Glimmer, Glow, and
  Radiance difficulty ranges.
- Added normalized Cue helpers and tests for deterministic selection,
  first-letter/remainder separation, case-insensitive and
  punctuation-tolerant validation, incomplete-position feedback, and canonical
  punctuation reconstruction.
- Added inline, touch-friendly fields that show the first letter as a light-grey
  placeholder but require the complete word from the learner. Input is
  sanitized and hard-clamped to the exact normalized word length for typing,
  paste, and autofill, preventing extra characters such as `kindsss`.
  Browser autocomplete, autocorrect, automatic capitalization, and spellcheck
  assistance are disabled.
- Added normalized-length keyboard auto-advance, Reset and refocus behavior,
  per-input green/red Check feedback, and accessible labels that explain the
  first-letter placeholder without conflating Cue with the Hint System.
- Connected correct answers to the authenticated, server-owned fourth-mode
  attempt before randomized victory audio, confetti, success toast, and the
  explicit completion interstitial leading to Fill.
- Extended administrator Test Replay to completed Cue modes without creating
  attempts or changing progression.
- Corrected mobile clipping in the shared completion interstitial. A safely
  centered flex layout now centers cards that fit while keeping oversized cards
  top-reachable and scrollable; compact mobile spacing further preserves the
  success icon and actions on short screens.
- All 21 gameplay tests, full ESLint, strict TypeScript, diff validation, and
  the production build passed before project-owner browser acceptance.

### 2026-07-26 — Phase 16 Swap Mode completed and accepted

- Recorded project-owner manual acceptance of Phase 15 Puzzle Mode.
- Added the complete Swap interaction surface with yellow available words,
  purple selection, second-word exchange, same-word deselection, Reset, and
  mobile-friendly 44px-or-larger targets.
- Applied deterministic Glimmer, Glow, and Radiance swap percentages through the
  existing day-difficulty helper.
- Kept occurrence identity separate from visible word text so duplicate words
  cannot produce a false correct result. Added tests for stable position
  identity, interactive exchanges, and canonical punctuation anchoring.
- Kept punctuation fixed at its original verse slot while only the word
  occurrence moves, preventing commas and full stops from travelling during a
  swap.
- Added per-position green/red Check feedback, wrong-answer audio, selection and
  exchange sounds, authenticated server completion, randomized victory audio,
  confetti, success toast, and the explicit animated Continue interstitial.
- Extended administrator Test Replay to completed Swap modes without creating
  attempts or changing progression.
- Corrected a custom-theme contrast conflict that could render the purple
  selected word as white text on a white surface. The selected treatment now
  enforces its violet background, border, and foreground together.
- Corrected the completion interstitial dismissing itself when the successful
  Server Action streamed refreshed session props. The shared shell now remains
  keyed to the session, holds the completed mode locally, suppresses its timer,
  and advances only through the player's explicit Continue action.
- All 16 gameplay tests, full ESLint, strict TypeScript, diff validation, and
  the production build passed before project-owner browser acceptance.

### 2026-07-26 — Phase 15 Puzzle Mode completed and accepted

- Added deterministic phrase-level hiding across the Glimmer, Glow, and
  Radiance difficulty ranges while retaining the existing stable 3–6-word
  phrase boundaries.
- Added position-based Puzzle state helpers and focused tests for stable bank
  order, one-to-one placement, incomplete submissions, and duplicate phrase
  occurrences.
- Added visually wider phrase tiles, numbered verse positions, the phrase bank,
  exact pointer collision, disabled drag auto-scroll, keyboard dragging, touch
  dragging, and mobile select-and-tap placement.
- Added reset, placed-phrase return, per-slot correct/incorrect feedback, failed
  Check audio, pickup/drop audio, randomized success audio, confetti, success
  toast, and the explicit animated completion interstitial.
- Connected successful Puzzle submissions to the existing authenticated,
  server-authoritative ordered-attempt action. The server continues to own
  canonical answer validation, deadlines, and mode progression.
- Generalized administrator Test Replay controls so completed Drag & Drop and
  Puzzle modes can be replayed without attempts, rewards, cooldowns, streaks,
  badges, or progression writes.
- Marked the existing server-enforced game-mode order and all-five-mode
  day-completion gate as implemented in the security audit.
- All 14 gameplay unit tests, focused ESLint, strict TypeScript, diff validation,
  and the production build passed before project-owner browser acceptance.

### 2026-07-23 — Phase 14 Drag & Drop completed and accepted

- Added deterministic hidden-word selection and shuffled word-bank ordering
  within each challenge-day range.
- Added position-based placement helpers and tests so duplicate word text never
  becomes the identity of a draggable token.
- Added desktop mouse dragging, touch dragging, keyboard dragging, mobile
  select-and-tap placement, placed-word return, reset, and per-slot feedback.
- Corrected pointer collision so a blank highlights only while the dragged
  pointer is physically over it, disabled drag auto-scroll to prevent
  disorienting viewport movement, and added immediate pickup/drop tones.
- Refined tap feedback so selecting a word highlights every available blank
  without weakening precise drag-drop collision. Returning a placed word now
  plays audio, while leading and trailing punctuation stays in the verse rather
  than following word-bank tiles.
- Unified selection feedback so starting a drag highlights all available blanks
  even when the word was not clicked first; successful drops still require the
  pointer to be physically inside a blank.
- Added a stronger success chord and an animated, reduced-motion-aware mode
  completion interstitial that waits for explicit Continue rather than
  automatically replacing the mode.
- Added an immediate wrong-answer sound and replaced the single success chord
  with a randomized, non-repeating three-sound victory pool: triumphant chord,
  bright fanfare, and a license-safe synthesized crowd-cheer-style celebration.
  The named pool can be extended or replaced with recorded assets later.
- Corrected the game-route theme inconsistency caused by fixed dark slate
  palettes in the shared gameplay shell. The shell, Drag & Drop surface, word
  bank, blanks, controls, and completion interstitial now honor saved Light,
  Dark, and System preferences through semantic theme colors.
- Diagnosed the remaining navigation reset: the landing theme switcher changed
  only next-themes browser storage while the authenticated account still stored
  `dark`, so the protected layout reapplied that database value. Added a
  validated session-derived theme action and focused repository upsert so
  authenticated switcher choices persist; anonymous choices remain local.
- Added a gameplay Exit control back to the current waypoint's Day Selection
  and an administrator-only Test Replay for completed Drag & Drop modes. Test
  Replay is clearly labeled and makes no attempt, reward, cooldown, or
  progression writes.
- Correct checks call the server-owned attempt completion action before success
  audio, confetti, toast feedback, and progression to Puzzle. Pending state
  prevents duplicate submissions.
- Gameplay, progression, and day-selection tests, strict TypeScript, ESLint,
  diff validation, and the production build pass. The project owner manually
  accepted the completed desktop and mobile interaction experience.

### 2026-07-23 — Journey Stage time limits resolved

- Defined forgiving per-mode limits: Recall 5 minutes, Strengthen 3 minutes,
  and Master 2 minutes; Learn remains untimed.
- Defined server-persisted attempt time as authoritative. Browser suspension,
  refresh, navigation, or device-clock changes cannot extend the deadline.
- Expiry fails only the current attempt and allows an immediate retry without
  erasing previously completed modes or awarding progress.
- Updated root instructions, product requirements, roadmap acceptance, security
  audit guidance, and this continuity log with the same contract.

### 2026-07-23 — Phase 12 manually accepted

- The project owner accepted the Day Selection presentation, challenge-state
  behavior, Journey Stage notices, reward previews, and session-start flow.
- The shared live countdown and server cooldown rejection already have focused
  automated coverage. The natural completion-to-cooldown browser flow remains a
  Phase 13 verification because playable modes and day completion begin there.
- Phase 12 is complete. Phase 13 — Gameplay Shared Engine is next after the
  accepted changes are committed and merged.

### 2026-07-22 — Phase 12 Day Selection implemented

- Added the protected dynamic waypoint route, route skeleton, preferred
  translation display, Journey Stage badge, no-hint/timed-stage notices, and
  mobile-first Glimmer, Glow, and Radiance cards.
- Derived ready, locked, cooldown, and completed states from persisted progress
  and server request time. Countdown expiry refreshes server state; it never
  authorizes gameplay in the browser.
- Added reward previews, complete flames, real-time countdowns, blocked-state
  Sonner feedback, pending buttons, action result toasts, and safe 404 handling
  for unavailable or learner-locked direct URLs.
- Added a validated authenticated Start action and gameplay repository that
  atomically prepare the day and create or resume its server-owned GameSession.
- Added a temporary protected session-ready destination for Phase 12 testing;
  Phase 13 will replace it with the five-mode gameplay shell.
- Corrected the Phase 12 roadmap to include Strengthen among timed Journey
  Stages, matching root instructions and the product specification.

### 2026-07-22 — Phase 11 manually accepted

- The project owner confirmed the complete Game Map works as intended,
  including Map A and Map B, shared responsive trail positioning, continuous
  loading, locked trail visibility, distant navigation, and return-to-current.
- Phase 11 is complete. Phase 12 — Day Selection Screen is next after the
  accepted changes are committed and merged.

### 2026-07-22 — Trail Navigator implemented

- Added a full-height right-side Map A panel with thumbnails, sequential trail
  numbers, waypoint ranges, completion progress, and current/locked/completed
  treatments.
- Kept all published trails visible while disabling navigation to fully locked
  groups. Opening centers the current trail in the panel.
- Distant jumps replace the small rendered trail window with the destination
  and its neighbors, preserving progressive rendering as the curriculum grows.
- Navigation honors the operating-system reduced-motion preference.
- Replaced the text trigger with a bottom-right icon control and added an
  adjacent icon control that returns directly to the current trail.

### 2026-07-22 — Shared trail coordinates approved

- Applied the project owner's five approved waypoint positions to mobile and
  large layouts across all three current trail themes.
- Centralized the positions so newly added trail artwork inherits the same
  layout unless the project owner explicitly requests different coordinates.
- Updated the configuration test to guard the exact shared layout.

### 2026-07-14 — Positioner field naming and help clarified

- Renamed the Preview Settings field to `Current-state waypoint`, clarifying
  that it chooses the marker receiving the larger active-player treatment.
- Renamed the sticky-toolbar selector to `Edit waypoint`, clarifying that it
  selects the marker whose coordinates are being changed without altering the
  simulated current state.
- Added keyboard-focusable, touch-sized tooltip icons to every Preview Settings
  field and to the toolbar selector, with distinct explanations of count,
  current state, preview width, breakpoint, and both button diameters.
- TypeScript, ESLint, all 16 map tests, and diff validation passed. The compact
  workspace production build passed immediately before this labels-and-help-only
  change; its final rerun was unavailable because the execution service reported
  an account usage limit. No database operation occurred.

### 2026-07-14 — Map positioner compact workspace implemented

- Removed the tall page header and above-preview configuration cards so the
  development route opens directly into the image workspace.
- Added a sticky compact toolbar with an Image Settings modal, tooltip-labelled
  mobile/large layout icons, Fit/Actual preview icons, active-waypoint selector,
  live zoom summary, and a controls-sheet trigger below desktop width.
- Kept the full inspector sticky beside the preview on desktop and moved the same
  settings, position fields, reset action, and export tools into a scrollable
  side sheet on smaller screens.
- Added Fit mode that calculates one non-enlarging scale for the PNG and waypoint
  controls together. Actual mode preserves configured CSS dimensions with a
  scrollable workspace. Clipping checks now use the rendered scaled diameter.
- Added pure coverage for Fit scaling. TypeScript, ESLint, all 16 map tests, the
  production build, and diff validation passed. No image upload, persistence,
  database operation, commit, or push occurred.

### 2026-07-14 — Five-waypoint continuous trail and responsive positioner implemented

- Changed Map A alone to one complete 9:16 image per five-waypoint group. Map B
  retains its original paginated groups of ten.
- Removed Map A's previous/next group controls. It now opens centered on the
  player's current map, preloads one neighboring map in each direction, mounts
  earlier history while scrolling upward, and mounts future maps while scrolling
  downward. Prepend anchoring prevents scroll jumps when history appears above.
- Restored the repeating Map 1 → Map 2 → Map 3 sequence with separate mobile and
  large-screen position arrays ready for owner-reviewed coordinates.
- Expanded `/map-positioner` with editable image dimensions, waypoint count,
  current-waypoint selection, breakpoint, mobile/large preview widths, normal and
  current button diameters, independent responsive coordinates, real-size
  draggable markers, boundary-clipping warnings, and full configuration export.
- Updated Phase 11 documentation and pure tests for independent group sizes,
  configurable positioner layouts, clipping detection, responsive theme data,
  and indefinite artwork repetition. TypeScript, ESLint, all 15 map tests, the
  production build, and diff validation passed. No database operation occurred.

### 2026-07-14 — Map A mobile clipping and crowding hardened

- Made Map A waypoint controls responsive: 64px normal and 72px current nodes on
  mobile, restoring the original 80px and 96px sizes from the `sm` breakpoint.
- Reduced the mobile card footprint, current-node label, status icon, flame
  indicator, spacing, borders, and shadows while preserving the required 44px
  minimum touch target and the full desktop presentation.
- Added responsive horizontal safe-edge clamping so percentage coordinates
  cannot place part of a waypoint card outside narrow artwork. Pulled each
  panel's final node away from the cloud seam and compacted the seam on mobile.
- Map B and progression behavior remain unchanged. TypeScript, ESLint, all 11
  map tests, the production build, and diff validation passed. No database
  operation was performed.

### 2026-07-14 — Five-waypoint PNG panels and atmospheric join implemented

- Preserved each logical group of ten waypoints while presenting it as two
  vertically stacked 9:16 panels with five comfortably spaced nodes per image.
- Added two repeating compositions: Map 1 + Map 2 and Map 3 + Map 1. Newly
  appended curriculum groups continue alternating these arrangements without a
  visual maximum or any change to progression data.
- Added a responsive CSS cloud-and-mist layer across the panel boundary. It sits
  above both images but below the waypoint controls, cannot intercept input, and
  does not modify the replaceable source PNGs.
- Updated configuration tests to guarantee five in-bounds positions per panel,
  two panels and ten positions per composition, and indefinite composition
  repetition. TypeScript, ESLint, all 11 map tests, the production build, and
  diff validation passed. No database operation was performed.

### 2026-07-14 — Owner-supplied PNG themes previewed in Map A

- Replaced Map A's generated scenery and SVG road with the three supplied PNGs,
  repeating Map 1 → Map 2 → Map 3 for an unlimited number of groups.
- Applied the owner's exact Map 1 positioner export and added initial road-based
  alignment coordinates for Maps 2 and 3 pending visual refinement.
- Kept waypoint buttons, status, flames, current-node emphasis, locking feedback,
  group navigation, progression data, and Map B behavior unchanged.
- Added pure configuration tests for ten in-bounds positions and indefinite
  three-theme cycling. No database or progression data was changed.

### 2026-07-14 — Development PNG map positioner implemented

- Added the development-only `/map-positioner` route; production requests are
  rejected by Proxy with HTTP 404 and repeated server-view `notFound()` defense,
  while metadata and the response are `noindex`.
- Added local PNG selection with exact natural aspect-ratio preview, ten draggable
  and keyboard-adjustable waypoint markers, numeric controls, reset, and
  paste-ready percentage-coordinate export.
- Kept selected artwork entirely inside the browser through a temporary object
  URL. No upload, Server Action, filesystem write, Prisma call, or database
  operation exists in the tool.
- Added pure tests for boundary normalization, pointer conversion, and export
  formatting; the standard map test script now includes them.
- TypeScript, ESLint, eight map tests, production build, diff checks, a live
  development HTTP 200 check, and a production HTTP 404 check passed.

### 2026-07-14 — Game Map documentation audit completed

- Audited every TypeScript/TSX script in `features/map` plus the shared flame and
  Journey Stage indicators used by the map.
- Expanded file, exported API, state, accessibility, responsive-layout, browser
  persistence, SVG geometry, privacy, and data-integrity comments without
  changing map behavior or database state.
- Preserved the required one-line route re-exports and added no comments there.
- TypeScript, ESLint, all five map tests, and working-tree diff validation pass.

### 2026-07-14 — Comparative Map A and Map B testing added

- Preserved the current winding campaign trail as Map A and recovered the
  original Phase 11 card-grid presentation from Git history as Map B.
- Added one accessible segmented switch, browser-local preference persistence,
  and deterministic `?variant=a` / `?variant=b` tester links.
- Centralized locked-waypoint feedback and gameplay routing so both variants
  consume identical progress data and cannot diverge behaviorally.
- Kept waypoint controls, status treatment, and flame progress minimal in Map A.
  After further owner review, Map B restored its original Scripture and Journey
  Stage previews while Day Selection remains the authoritative detail screen.
- Added focused variant parsing and precedence tests. No schema, migration,
  repository query, progression rule, or database data changed.
- Corrected Map B phone-width clipping by compacting long Journey Stage badges,
  allowing Scripture references to wrap safely, tightening status/flame spacing,
  and using one column below 360px instead of forcing unusably narrow cards.

### 2026-07-13 — Phase 11 mobile campaign trail redesign

- Replaced the initial responsive card grid with an original mobile-first
  winding trail inspired by familiar campaign-map interaction patterns without
  copying external artwork or branding.
- Added alternating tactile nodes, connected SVG trail progress, exact
  three-day rings, active-waypoint callout, distinct status treatments,
  scrollable group indicators, and lightweight code-native scenery.
- Redesigned the route skeleton and page header to match the immersive trail
  composition while retaining accessibility, reduced-motion behavior, dark
  mode, existing progression rules, and the batched repository read.
- Simplified node labels after product-owner review: removed visible verse and
  Journey Stage details from the map and retained only flame progress beneath
  each waypoint control.

### 2026-07-13 — Phase 11 Game Map implemented

- Added the protected `/game/map` experience and a discoverable entry from the
  temporary authenticated home.
- Loaded all currently published waypoints plus one learner's sparse waypoint
  and completed-day progress in one batched Prisma request without N+1 reads.
- Rendered one responsive ten-waypoint group at a time with scrollable range
  navigation, Journey Stage badges, status, flame count, locked guidance, and
  current-node emphasis.
- Added an intentional no-curriculum state, route-level ten-card skeleton, and
  the stable future Day Selection destination used by Phase 12.
- Added three pure map-state tests. Strict TypeScript, ESLint, diff validation,
  repository-boundary and thin-route checks, and the production build passed.
  No migration, seed, MCP write, or destructive database operation was run.

### 2026-07-13 — Dedicated Prisma Postgres test database verified

- Installed and authenticated Prisma's official Codex plugin and MCP server.
- Created the non-default `scripture-memo-integration-tests` database as a
  separate Prisma project in Europe (Frankfurt); the existing application
  database was not queried, migrated, or modified.
- Added fail-closed test URL and confirmation validation compatible with Prisma
  Postgres resource URLs, plus focused guard tests.
- Applied all four existing migrations only to the new test resource, without
  seeding it.
- Phase 9 waypoint lifecycle/concurrency and Phase 10 progression/curriculum-lock
  integration suites both passed against real PostgreSQL and completed cleanup.

### 2026-07-13 — Phase 10 curriculum-lock race corrected

- Accepted PR review feedback that first-waypoint initialization and the next
  waypoint unlock could race administrator curriculum mutations.
- Progression now acquires the same transaction-scoped curriculum advisory lock
  used by waypoint administration and holds it across availability selection and
  learner-progress creation.
- Extended isolated database coverage to exercise initialization and next-unlock
  behavior while an administrator transaction holds and mutates under that lock.

### 2026-07-13 — Phase 10 progression engine implemented

- Added lazy first-playable-waypoint initialization and idempotent registration
  and login repair hooks without pre-creating future locked progress.
- Added UTC-safe day ordering and cooldown utilities with focused unit tests.
- Added transaction-locked gameplay preparation and trusted day completion;
  repeat completion, skipped days, cooldown bypass, locked waypoints, and stale
  publication state are rejected server-side.
- Made Day 3 completion, current waypoint completion, and next published
  waypoint unlock atomic. Curriculum numbering gaps are supported and reaching
  the end of currently published curriculum returns a caught-up result.
- Added eight application-wide progression error references and a guarded
  PostgreSQL integration suite. Unit tests, catalogue tests, strict TypeScript,
  lint, architecture checks, diff validation, and production build passed. The
  suite was subsequently executed successfully on the dedicated test resource.

### 2026-07-13 — Operational error-code foundation implemented

- Extended failed `ActionResult` responses with catalogue-derived typed codes and
  added a shared persistent Sonner presenter for coded failures.
- Added 13 documented waypoint and verse codes covering curriculum history,
  publication continuity, Journey Stage rules, stale state, dependencies, and
  unexpected transactional failures.
- Added the server-authorized, searchable, `noindex` `/admin/error-reference`
  page. Its permanent link is intentionally deferred to the future admin front
  page instead of coupling the shared manual to Waypoints or Verses.
- Added fast catalogue tests for code uniqueness, format, and documentation
  completeness while leaving ordinary field validation uncoded.
- Updated authoritative agent, product, roadmap, security, and continuity
  documentation. Catalogue tests, strict TypeScript, ESLint, diff checks,
  thin-route validation, and the production build all passed.

### 2026-07-13 — Direct waypoint positioning added

- Added a per-row **Move to position** dialog for efficient long-distance
  waypoint reordering while retaining arrow controls for small adjustments.
- Direct moves validate whole-number bounds, progressed-waypoint immutability,
  the continuous published prefix, and per-verse Journey Stage order before
  updating local state.
- Successful moves report the requested destination and affected-position count,
  appear in the existing movement preview, and remain pending until **Save
  order** is selected.
- Strict TypeScript, ESLint, diff validation, and the production build passed.

### 2026-07-13 — Phase 9 curriculum-history hardening implemented

- Made published waypoint assignments editable only after hiding an unstarted
  waypoint and made every waypoint with learner-linked records immutable.
- Blocked verse archival while a published waypoint depends on it and froze
  verse content once learner history exists.
- Serialized curriculum topology and verse dependency mutations with shared
  PostgreSQL advisory locks and expanded assignment audit metadata to include
  previous and new state.
- Added an isolated PostgreSQL integration suite guarded by `TEST_DATABASE_URL`;
  its original URL-name check was later replaced by the Prisma Postgres-aware
  fail-closed guard after the dedicated resource was provisioned.
- Added the direct `server-only` dependency needed by standalone repository test
  execution without weakening the Next.js server boundary.
- Updated root instructions, product behavior, Phase 9 acceptance, and Phase 10
  progression constraints. Prisma validation, TypeScript, ESLint, diff checks,
  thin-route validation, and the production build passed.

### 2026-07-13 — Phase 9 assignment modal regression corrected

- Added the missing assigned-waypoint statistic alongside total, unassigned,
  published, and hidden counts.
- Reset assignment-dialog verse and stage state from persisted props on open,
  close, cancellation, successful save, and rejected save so a failed attempt
  cannot appear as the current assignment when the modal is reopened.
- TypeScript, ESLint, `git diff --check`, and the production build passed after
  the regression correction.

### 2026-07-13 — Phase 9 scalability and curriculum invariants revised

- Replaced the fixed 220 limit with ADMIN append-at-end behavior while retaining
  the idempotent 220-record bootstrap seed.
- Added waypoint statistics, continuous publish/hide rules, per-verse stage
  uniqueness and ordering, progress-aware reorder locks, pending visibility
  feedback, detailed movement previews, and aligned assignment-dialog actions.
- Added a PostgreSQL partial unique index migration so Learn, Recall, and
  Strengthen cannot duplicate for a verse while Master remains repeatable.
- Applied the invariant migration successfully. TypeScript, ESLint, Prisma
  validation, `git diff --check`, architecture checks, and the production build
  all passed; revised Phase 9 manual acceptance remains.

### 2026-07-13 — Phase 9 waypoint management implemented

- Approved the hidden, unassigned placeholder lifecycle with provisional
  `LEARN` stage and documented its lack of gameplay effect before publication.
- Added the Phase 9 repository, validated ADMIN actions, atomic audit records,
  fixed-slot ordering, searchable verse assignment, explicit Journey Stage
  selection, visibility controls, admin route, and Prisma 7 seed workflow.
- Added `tsx` as a development dependency for the documented TypeScript seed.
- Seeded all 220 placeholders successfully; a repeat run inserted zero and
  preserved all 220, confirming idempotency.
- TypeScript, ESLint, `git diff --check`, architecture checks, and the production
  Next.js build passed. Manual ADMIN acceptance remains.

### 2026-07-13 — Phase 8 manually accepted

- The project owner confirmed that all Phase 8 manual acceptance tests passed.
- Pack creation, published-verse membership, persistent ordering, visibility
  controls, empty-pack publishing prevention, and automatic hiding after final
  verse removal are accepted.
- Phase 8 is complete; Phase 9 — Admin Waypoint Management is the next roadmap
  task.

### 2026-07-13 — Phase 8 admin pack management implemented

- Added ADMIN-authorized pack repositories, Zod schemas, seven Server Actions,
  transaction-backed audit logging, and hidden/published lifecycle enforcement.
- Added `/admin/packs`, `/admin/packs/new`, and `/admin/packs/[id]/edit` through
  one-line route re-exports with protected loading and error boundaries.
- Added list, metadata form, searchable published-verse assignment, removal,
  persistent ordering, and publish/hide confirmation UI.
- Reordering supports mouse, touch, keyboard sensors, and explicit move buttons;
  two-phase temporary positions preserve the database uniqueness constraint.
- Phase 8 automated verification passed; manual ADMIN acceptance remains.

### 2026-07-13 — Phase 7 audit hardening

- Accepted PR review feedback that publish/archive availability changes lacked
  accountability records and applied the correction consistently to create,
  update, publish, and archive.
- Added stable audit action identifiers and centralized bounded request-IP
  extraction for server-derived audit context.
- Verse writes and their audit records now commit or roll back together.
- Update audits record changed field names only; status audits record prior and
  new availability without duplicating authored content.

### 2026-07-13 — Reference card and searchable long lists

- The project owner accepted canonical form and CSV boundary checks.
- Redesigned the Scripture reference card with a prominent generated-reference
  summary and aligned responsive location controls.
- Added a shared accessible searchable-select pattern and applied it to Bible
  books and countries while preserving simple controls for short lists.

### 2026-07-13 — Canonical Bible location validation implemented

- Added a reproducible, count-only dataset for all 66 books, 1,189 chapters, and
  31,102 NIV/KJV-compatible verse positions.
- Manual creation and editing now use a book selector, dynamic chapter and verse
  bounds, and a read-only generated reference preview.
- Server validation regenerates every reference from structured fields and
  rejects impossible locations independently of client controls.
- Removed `reference` from the CSV contract; imports use the same canonical
  validation and generation rules as individual forms.

### 2026-07-13 — Immediate verse filters implemented

- The project owner manually accepted CSV import and debounced search.
- Book, tag, publication status, and sorting controls now update immediately,
  preserve URL state, reset pagination, and show shared pending feedback.
- Removed the redundant Apply Filters button.

### 2026-07-12 — Phase 7 admin verse management implemented

- Added ADMIN-protected verse repositories, schemas, actions, normalization,
  create/edit forms, list table, filters, pagination, and publish/archive flow.
- All three MVP translations are required and `normalizedText` is generated only
  in the repository from trusted server input.
- Tags use normalized join records and Unicode-safe stable slugs.
- TypeScript, ESLint, diff validation, production build, thin-route checks, and
  repository-only Prisma architecture pass.
- Manual acceptance requires an ADMIN account; initial administrator bootstrap
  remains a project-owner decision.
- Upgraded the study-note field from a plain textarea to a Markdown editor with
  mobile-friendly controls, keyboard shortcuts, write/preview modes, and safe
  React rendering. Markdown remains in the existing `studyNote` text column.
- Fixed an intermittent post-create verse-list failure by removing an unnecessary
  read-only Prisma transaction. Independent list queries now use the normal
  connection-pool queue, and failures receive sanitized contextual server logs.
- The project owner manually accepted create, edit, filter, sort, archive, and
  publish behavior, completing the original Phase 7 acceptance criteria.
- Added an approved CSV enhancement with a downloadable strict template,
  row-level preview, duplicate and invalid-row reporting, server revalidation,
  transactional creation, normalized translations, and an admin audit record.
- Verse reference/book search now updates after a 300ms typing debounce while
  retaining URL-backed filters and pagination reset behavior.

### 2026-07-12 — Phase 6 profile and settings implemented

- Added protected profile/settings repositories, validation, action, form, view,
  and one-line route.
- Added ISO country selection, public-safe journey statistics, Bible translation,
  audio, reduced-motion, and theme preferences.
- Profile identity and preferences update atomically using the server session ID;
  no client-provided user ID is accepted.
- Added a protected-layout preference synchronizer so saved theme, motion, and
  audio state reapply across authenticated navigation and later sessions.
- TypeScript, ESLint, diff validation, production build, repository-boundary
  audit, thin-route audit, and anonymous `/settings` redirect passed.
- Manual authenticated persistence testing remains before Phase 6 is accepted.
- Fixed post-login continuation: Proxy-provided internal destinations such as
  `/settings` are now preserved through login, validated against the protected
  route allowlist to prevent open redirects, and resumed after authentication.

### 2026-07-12 — Phase 5 accepted

- The project owner confirmed the manual authentication flow works correctly.
- Final verification passed: Prisma format/validate/generate, TypeScript, ESLint,
  diff validation, production build, five-rule password-schema behavior, public
  auth rendering, and anonymous redirects for game, translation, and admin paths.
- Phase 5 is complete; Phase 6 — User Profile and Settings is next.

### 2026-07-12 — Phase 5 authentication implemented

- Added validated register/login/logout actions, onboarding repository writes,
  responsive forms, translation selection, session helpers, and protected routes.
- Added full-session Proxy guards for protected and admin routes.
- Added and applied Better Auth's database-backed rate-limit migration.
- Verified Prisma, TypeScript, ESLint, production build, public auth rendering,
  and anonymous protected-route redirects.
- Left manual credential and admin-role acceptance testing to the project owner;
  no test user was inserted into the configured database.
- Improved login-to-registration continuity: the entered login email is carried
  once through tab-scoped `sessionStorage`, then removed after prefilling the
  registration form. Passwords are never persisted and emails are not placed in
  URLs or server logs.
- Added an accessible password visibility toggle and live password-strength
  checker to registration. Added only the approved special-character validation
  rule while preserving the existing length, letter, and number requirements.
- Refined password-field polish after visual review: visibility controls are
  anchored to the input midpoint, and the Good strength state uses a dedicated
  lime treatment that remains distinct in dark mode.
- Strengthened registration passwords by replacing the general letter rule with
  separate lowercase and uppercase requirements. The live checker now uses five
  requirements and reserves Strong for passwords satisfying all five.
- Diagnosed translation onboarding that saved successfully but remained on the
  pending screen. Removed overlapping client push/refresh navigation, added a
  safe action failure result, and made settings persistence self-healing with an
  upsert for partially onboarded accounts.

### 2026-07-12 — Phase 4 completed

- Implemented all Phase 4 core-library tasks and the approved auth-owned action
  contract example.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting balance for new users.
- Verified TypeScript, ESLint, diff checks, date arithmetic, permission failures,
  Prisma generation, and the production build.
- Left all changes uncommitted for project-owner review.

### 2026-07-12 — Continuity system established

- Reviewed root instructions, product overview, roadmap, current repository,
  Git history/state, and the recovered 2026-07-11 transcript.
- Added the project continuity workflow to root `AGENTS.md`.
- Created and populated this project log.
- Confirmed normal conversation history remains part of future context recovery.
- Confirmed the repository is authoritative when any source disagrees.
- No application code changed; changes were intentionally left uncommitted.

### 2026-07-12 — Phase 4 action ownership approved

- The project owner approved `features/auth/actions/` as the owner of Phase 4's
  placeholder Server Action using the shared `ActionResult` type.
- Phase 4 implementation has not started and awaits an explicit instruction to
  proceed.

### 2026-07-12 — Phase 3 completed

- Completed the full product-aware Prisma schema.
- Applied migration `20260712014802_complete_product_schema`.
- Verified Prisma generation/validation, TypeScript, ESLint, critical database
  constraints, and the production build.

### 2026-07-11 — Foundation work recovered

- Recovered the prior development transcript into the codex-history archive.
- Completed project bootstrap and global UI foundation work.
- Added the landing page, theme system, shared components, and UI preview.

### 2026-08-06 — Shared navigation elevation

- Refined the persistent player navigation elevation so the desktop side rail
  casts a subtle shadow toward the centre content and the mobile bottom bar
  casts the matching restrained shadow upward.
- Kept the treatment on the shared navigation component so every protected
  game page receives the same visual separation automatically.

### 2026-08-06 — Hosted database operation reduction and local isolation

- Confirmed routine development had been pointed at hosted Prisma Postgres, so
  hot reloads, manual testing, seeds, builds, session lookups, and page refreshes
  were all consuming the production workspace's monthly operation allowance.
- Started a persistent named Prisma Postgres Local instance, switched the ignored
  development `.env` to its loopback URL, preserved the former hosted settings
  in an ignored local backup, deployed all 21 migrations, and seeded the local
  catalogues successfully.
- Made the root seed deterministic and local-proxy-safe by running its three
  bounded catalogue seeds sequentially instead of opening concurrent short-lived
  Prisma clients.
- Added a tracked `.env.example` and documented the isolated local database
  workflow. Hosted credentials remain deployment-only; integration tests retain
  a separate fail-closed test database contract.
- Deduplicated Better Auth sessions and settings within a server render, made
  locale selection cookie-first with the database retained as a cross-device
  fallback, and removed a duplicate translation-settings query from map loads.
- Removed progression initialization from ordinary established-user map reads.
  The map now attempts the idempotent recovery transaction only after its first
  read proves that all learner progression is missing.
- Reduced presence and leaderboard refresh frequency from two/three minutes to
  fifteen minutes, and prevented leaderboard refreshes while its tab is hidden.
- Added a permanent database operation and cost-efficiency rule to `AGENTS.md`
  and the product overview so future designs must consider query amplification,
  polling frequency, local isolation, and hosted cost without weakening server
  security or transactional integrity.
- Verified Prisma schema and generation, the idempotent local seed, TypeScript,
  ESLint, i18n tests, map tests, diff checks, and the production build. The first
  sandboxed build could not download Google Fonts; the network-enabled retry
  completed successfully.
- The local database is a fresh development resource and therefore does not
  contain the hosted learner accounts or progress. Development can resume now;
  existing hosted data will become available again when Prisma restores service
  or the plan changes, without needing to point routine development back to it.

### 2026-08-09 — Local database inspection fallback

- Confirmed Prisma Studio's schema-metadata failure persisted with a direct local
  URL, a fresh port, and both Node 24 and temporary Node 22 runtimes. Prisma
  Client, migrations, seeding, and the local PostgreSQL database remained healthy.
- Installed DBeaver Community 26.1.4 as the local visual database client and
  documented its connection settings and strict viewer-only role in the README.
- Prisma remains the application's ORM, schema authority, migration workflow, and
  production integration. DBeaver introduces no alternate schema or data format,
  so no future migration back to Prisma is required.

### 2026-08-09 — Guarded local gameplay fixtures

- Added a separate local fixture feature and CLI workflow that validates a direct
  loopback PostgreSQL URL before constructing Prisma Client and refuses production
  mode, hosted hosts, and Prisma proxy URLs.
- Added five public-domain KJV verses and published waypoint fixtures covering all
  five map positions without adding copyrighted NIV or ESV text under incorrect
  translation labels.
- Kept the production seed unchanged: local gameplay fixtures run only through
  `npm run local:fixtures`, remain idempotent before learner history exists, and
  fail closed instead of overwriting progressed waypoints.
- Added `npm run local:player -- <email> [--admin]` for an account that was first
  registered through Better Auth. It prepares profile, KJV settings, streak, role
  when explicitly requested, and first-waypoint access without touching password,
  account, or session records.
- Applied the curriculum fixture to Prisma Postgres Local and confirmed the second
  run reused all five verses without duplicates. Verified the URL safety tests,
  TypeScript, and ESLint.
- Prepared the first Better Auth-registered local tester as an ADMIN, selected
  KJV for the fixture curriculum, repaired its application foundation records,
  and unlocked Waypoint 1 without reading or modifying its credentials.

### 2026-08-09 — Large-screen game shell and leaderboard context rail

- Added a reusable mobile-first center-and-context page composition. Routes
  remain a single focused column on small screens and may supply a sticky,
  feature-owned right panel when large-screen width permits.
- Adopted the contextual rail on the leaderboard using its existing page data
  for league, official rank, Weekly Beacon Points, Beacon Level, and Crowns;
  the richer desktop layout therefore adds no database operations.
- Widened the protected desktop navigation and placed icons beside labels while
  retaining the compact tablet rail. Replaced hard-coded dark-only navigation
  colors with theme tokens and kept matching subtle elevation on the desktop
  rail and mobile bottom bar.
- Verified the affected shell and leaderboard files with TypeScript and ESLint.
  Project-owner responsive visual acceptance remains pending before Phase 27
  is marked complete.
- Reworked the contextual area into a fixed full-height shell column separated
  from the center by a restrained border and shadow. Page-owned content now
  portals into its scrollable upper region instead of rendering as a floating
  column card.
- Anchored a shared Luna Partner invitation at the base of that column for all
  protected non-gameplay pages. Its action opens the Shop Donations tab through
  URL state, preserving a meaningful destination across direct links and page
  refreshes.
- Removed the right rail from Map and Admin routes, narrowed it on remaining
  large-screen pages, and removed its floating shadow so a single dividing line
  defines it as part of the shell. Reduced the persistent Partner card and
  constrained route context to compact, non-scrolling secondary information.
- Simplified the leaderboard context to Beacon Level and Crowns only because
  league identity, weekly score, official rank, timing, and movement zones are
  already visible or directly inferable from the center board.
- Rebalanced the large-screen shell after visual review: reduced the expanded
  left navigation from 256px to 192px and the context rail from 288px to 256px,
  returning 96px to the primary center experience without changing tablet or
  mobile navigation dimensions.
- Replaced the desktop rail flame mark with Luna and kept the Scripture Memo
  wordmark on one line. Flattened the leaderboard page heading and reduced its
  competing visual weight.
- Replaced membership-generated leaderboard tabs with four stable scopes.
  Fellowship selection now lives inside the Fellowship view, and the mobile
  scope controls use a non-scrolling two-by-two grid.
- Removed the redundant exact-reset block from the league summary, retained the
  concise remaining-time signal, and reduced Rank Info to an icon-sized help
  control so the league emblem and ranking movement remain primary.
- Corrected that refinement after responsive review: the simplification applies
  only to desktop. Mobile again shows Rank Info beside the exact reset detail,
  while very small screens retain the earlier icon-only Rank Info treatment.
- Restored both Rank Info and the exact reset detail on large screens as well.
  Their desktop stack now uses a larger gap so each element remains distinct;
  mobile and very-small-screen behavior remains unchanged.
- Consolidated the four leaderboard scopes into a single segmented mobile bar.
  Icons sit above compact labels, the active scope receives the violet game
  treatment, and every scope remains visible without horizontal or vertical
  navigation scrolling.
- Refined large-screen branding after visual review: removed the background and
  inset treatment from the left-rail Luna wordmark, stacked its name as two
  left-aligned lines, and rebuilt the leaderboard heading with a compact trophy
  tile immediately beside the title and subtitle.

### 2026-08-10 — Luna silhouette asset

- Preserved the supplied square Luna face silhouette as an approved mascot
  asset at `public/images/mascot/luna/luna-silhouette.png` without assigning it
  to a production surface prematurely.
- Registered the silhouette in the shared Luna asset catalogue and added it to
  the `/ui-foundation` Luna production gallery for future visual evaluation.
- Audited weekly Beacon placement behavior: promotion, demotion, final rank,
  and Saint Crown outcomes are persisted when the learner enters the new week,
  but no player-facing weekly-result notice or persistent notification centre
  currently exists.

### 2026-08-10 — Weekly league results and notification centre

- Added a persistent, localized notification model with stable event types,
  primitive JSON payloads, read state, one-time presentation state, and indexed
  bounded inbox reads. No notification polling or scheduled database reads were
  introduced.
- Weekly Beacon finalization now creates exactly one Promoted, Stayed, or
  Demoted notice inside the same transaction that records the finalized rank
  and next league. Saint Crown awards are included in the result payload.
- Added a global tactile notification bell, unread count, read/read-all inbox,
  and a dedicated Luna weekly-result celebration that requires Continue before
  it closes. Added all three placement variants to `/ui-foundation`.
- Applied migration `20260810190000_add_user_notifications` to the configured
  local PostgreSQL database and regenerated Prisma Client.
- Reprocessed the Luna silhouette as a 32-bit PNG with only the exterior canvas
  made transparent; enclosed white facial and eye artwork remains opaque.
- Verified TypeScript, ESLint, localization contract tests, and Beacon tests.
- Refined the result art direction so Stayed uses Luna Retry, Promoted uses Luna
  Celebrate, and Demoted uses Luna Encourage.
- Moved the notification control into a universal theme-aware dashboard bar
  that starts after the desktop left rail and spans the center plus contextual
  right column. Added compact Glow, streak, and lifetime Beacon counters using
  one non-polling summary read over existing profile and streak aggregates.
- Kept active gameplay free of the dashboard bar and verified the refinement
  with TypeScript, ESLint, and the localization contract test.
- Aligned the desktop Luna wordmark with the universal top bar, normalized the
  notification trigger to the same quiet stat-pill treatment, removed the
  leaderboard's duplicated visible title, and made narrow-phone route identity
  icon-only so labels cannot clip into incomplete words.

### 2026-08-10 — Phase 27 manually accepted

- The project owner accepted the responsive Great Beacon experience, league
  progression and results, privacy-safe rankings, player identity treatments,
  notification centre, and protected player shell.
- Phase 27 is complete. Phase 28 — Admin Dashboard and Badge Management is next
  in roadmap order.

### 2026-08-10 — Prisma Local stale-lock recovery

- Diagnosed a post-merge leaderboard 404 and Better Auth `Failed to get
  session` error as a local database startup failure rather than a missing route
  or merged application regression.
- Prisma Local retained an empty stale `.lock` directory while no database
  process was listening. Removed only that verified empty lock, restarted the
  persistent `scripture-memo` instance, executed a direct SQL health probe, and
  confirmed all 22 migrations are applied. No database data or application code
  was changed.

### 2026-08-10 — Parallel Concept Luna comparison set

- Created a separate flat-illustration Concept Luna collection matching the
  approved production roles: avatar, guidance, celebration, encouragement,
  loading, retry, reward, three full-size reminder emotions, three compact
  notification portraits, and a silhouette.
- Preserved every existing production Luna asset and added a dedicated typed
  `ConceptLunaMascot` registry so experimental artwork cannot silently replace
  the approved collection.
- Added Current Luna and Concept Luna tabs to the `/ui-foundation` mascot
  gallery for direct, role-for-role comparison on mobile and large screens.
- Recorded the approval boundary in `AGENTS.md`, `docs/UI-UX-GUIDE.md`, and the
  concept asset README: Concept Luna remains preview-only unless the project
  owner explicitly approves its use on a specific product screen.
- Added a documented, reproducible Sharp processing script that converts the
  retained chroma-key sources into transparent public PNG assets. It keeps the
  collections separate and writes only the explicitly requested Current Luna
  bust into the production mascot directory.
- Corrected the Concept Luna avatar to a true head-only mark and preserved its
  former upper-body artwork as the separate `bust` role. Added a matching Current
  Luna bust with her production rendering, pendant, and forehooves so both tabs
  now compare Avatar and Bust consistently.
- Assigned the corrected Concept head avatar a new immutable public filename so
  Next/Image and browser caches cannot mistake the old bust response for the new
  head-only artwork in `/ui-foundation`.

### 2026-08-10 — Phase 28 admin control center implementation

- Added the protected `/admin` control center with users, verses, assigned
  waypoints, badges, and 30-day active-user statistics. All five values are
  returned by one aggregate database query to avoid multiplying hosted database
  operations on routine dashboard visits.
- Added mobile-first administrator navigation cards for Verses, Packs,
  Waypoints, Badges, the operational error guide, Super Admin User Management,
  and the existing Settings surface.
- Added Super Admin-only `/admin/users` with bounded name/email search,
  pagination, compact progress summaries, role controls, and account access
  controls. Regular Admins are redirected in Proxy and again at the server-view
  boundary.
- Made role changes atomic with their audit records, prevented self-demotion and
  final-Super-Admin demotion, and recorded old and new roles without exposing
  private data in logs.
- Implemented audited account suspension/restoration using the existing product
  suspension fields. Suspension deletes every Better Auth session in the same
  transaction, login performs a single indexed suspension check before session
  creation, and the last active Super Admin cannot be suspended.
- Reused the existing audited manual badge-award form instead of duplicating the
  grant workflow; User Management links directly to that anchored control.
- Added protected route loading UI and pending feedback for search, pagination,
  role changes, suspension, restoration, and every admin navigation action.
- Verified TypeScript and affected-file ESLint with no errors, and ran all eight
  badge catalogue tests successfully. Direct repository smoke testing was not
  run because standalone `tsx` does not load the app's local `DATABASE_URL`;
  manual route verification remains the Phase 28 acceptance gate.

### 2026-08-10 — Local Phase 28 authorization accounts

- Extended the loopback-guarded `local:player` command with an explicit
  `--super-admin` option while preserving `--admin` and the no-role-change
  default. Conflicting privilege flags fail before any database write.
- Prepared `localtestuser1@test.com` as `SUPER_ADMIN` and
  `localtestuser2@test.com` as `ADMIN` in the configured local PostgreSQL
  database. Both accounts retain Better Auth-owned credentials and received the
  existing idempotent local player foundation for Phase 28 manual testing.

### 2026-08-10 — Admin access from Game Home

- Added a localized, tactile Admin navigation control to the authenticated Game
  Home for both `ADMIN` and `SUPER_ADMIN` accounts. The trusted server session
  decides whether the control is rendered, so ordinary players never receive it.
- Kept `/admin` authorization independent of this convenience link: Proxy and
  the server-rendered admin boundary remain responsible for access enforcement.

### 2026-08-10 — Admin user-list views

- Added Table and Card presentations to `/admin/users`, with Table as the
  default. Switching is immediate client UI state and performs no navigation or
  additional database query.
- Kept the existing account cards intact and added a compact table presentation
  with player, role, progress, and action columns. On small screens, each row
  stacks its secondary fields to remain readable without horizontal scrolling.
- Preserved audited role changes, suspension/restoration confirmation, disabled
  self-management controls, and pending feedback in both presentations.
- Normalized the Save and Suspend/Restore controls to the same touch-friendly
  height in both views so adjacent account actions align consistently.
- Consolidated session revocation, suspension/restoration, and account deletion
  into one tactile Actions menu shared by Table and Card views.
- Added separately validated and audited session-revocation and account-removal
  Server Actions. Account removal is implemented as irreversible anonymization:
  Better Auth sessions and credentials, identifying User/Profile fields, private
  notes, and favorites are removed while progression, rewards, fellowships, and
  audit history remain structurally valid.
- Protected the current Super Admin and the final active Super Admin from unsafe
  account operations, required typed `DELETE` confirmation, and disabled future
  role/access actions for already anonymized accounts.
- Simplified the account Actions trigger to the standard vertical-dots icon,
  reserved modal-header space for the tactile close control, and normalized all
  confirmation-footer buttons to one explicit touch-friendly height.
- Removed the table action column's equal-width filler space and aligned its
  Save/menu group and heading to the row's trailing edge.
- Replaced the manual badge-award email field with predictive Super Admin-only
  account suggestions. Lookup starts after three characters and a 400 ms pause,
  returns at most six active accounts, ignores stale responses, and caches prior
  queries in the browser to minimize PostgreSQL operations.

### 2026-08-10 — Manual badge-award player notifications

- Added `BADGE_AWARDED` as a stable localized notification event and applied
  migration `20260810224500_add_badge_awarded_notification` to the configured
  local PostgreSQL database.
- Manual badge awards now create the unread learner notice inside the existing
  badge/reward/audit transaction. This preserves atomicity, reuses the badge and
  user lookup already in progress, and avoids notification polling or another
  database round trip.
- Applied idempotent migration
  `20260810230000_backfill_manual_badge_award_notifications` so recipients of
  earlier manual awards also receive their missing notice without any repeat
  reward or duplicate notification.
- Badge notices display the awarded badge name and Glow reward in English,
  Spanish, or French. Selecting the notice marks it read, closes the drawer,
  and opens the learner's badge collection.
- Prisma generation and validation, localization contract tests, badge catalogue
  tests, TypeScript, and targeted ESLint all pass.

### 2026-08-10 — Local Test User 3 progress reset

- Added a loopback-database-only maintenance command at
  `scripts/reset-local-player-progress.ts`. It validates one exact email and
  resets gameplay history, rewards, badges, purchased hints, streaks, Beacon
  state, and notifications in one transaction while preserving Better Auth
  credentials/sessions, role, settings, identity, notes, favourites, and
  Fellowship membership.
- Reset `localtestuser3@test.com`: removed zero sessions, zero day records, one
  waypoint record, three badge records, and three reward-ledger records. All
  derived game counters were restored to zero and Waypoint 1 was recreated as
  the sole fresh-player unlock.
- TypeScript and targeted ESLint pass for the guarded repository operation and
  extensively documented command.

### 2026-08-10 — Phase 28 accepted

- The project owner confirmed that the manually awarded badge appears as an
  unread recipient notification and that selecting it opens the badge
  collection.
- All Phase 28 automated checks and required manual checks now pass. Phase 28 —
  Admin Dashboard and Badge Management is complete and accepted; Phase 29 —
  Seed Data is next.

### 2026-08-27 — Approved 100-verse curriculum replacement

- Archived the approved source documents under `prisma/source-data/` and added
  an Office-independent build command that validates and generates canonical
  curriculum JSON.
- Replaced the local curriculum with 100 active verses and 400 active waypoint
  assignments. Numbers 1–400 are unique and contiguous, and every verse has
  Learn, Recall, Strengthen, and Master placement.
- Imported KJV, WEB, and BSB for every verse (300 normalized rows). Added WEB and
  BSB to Prisma and changed new defaults to KJV; NIV/ESV remain optional for
  future licensed content.
- Converted all 31 supplied study-guide sections to Markdown while preserving
  headings, emphasis, lists, quotations, and devotional structure. The remaining
  69 verses intentionally have no study material yet.
- Wrote a timestamped recovery snapshot before mutation. Preserved three Better
  Auth accounts, identity/settings, roles, purchases, notifications, and two
  Fellowship memberships while resetting all earned progress and counters.
- Recreated only the initial Waypoint 1 unlock for each account. Verification
  reports 100 active verses, 400 active waypoints, 300 translations, 31 study
  guides, and no residual sessions, day records, rewards, badges, or counters.
- Updated normal Prisma seeding to install this curriculum idempotently with the
  existing 27 badges and three shop items. Migration/generation, TypeScript,
  ESLint, seed idempotency, and local aggregate verification all pass.

### 2026-08-28 — Structured Sanctuary study content

- Replaced heading-dependent Sanctuary parsing with eight typed, ordered
  `VerseStudySection` records: Book Background, Historical Context, Study Note,
  Key Lesson, Application, Cross References, Word Study, and Prayer.
- Kept reflection and tags in their existing structured storage and now render
  them directly in the Sanctuary, so future admin entries always reach the
  correct card without relying on wording inside one large Markdown field.
- Replaced the admin's single study-guide editor with eight clearly labelled
  Markdown editors. Verse create, edit, audit, and bulk-import paths now persist
  the same canonical section contract.
- Applied migration `20260828130000_add_structured_study_sections` locally. It
  retained the legacy `Verse.studyNote` column for rollback safety and backfilled
  all 31 supplied guides into 248 typed sections; the 69 intentionally empty
  guides remain empty.
- Updated ordinary and local curriculum seeders plus development fixtures to
  create structured sections. Added compatibility tests for audited headings and
  heading-free legacy notes.
- Prisma validation/migration, aggregate curriculum verification, TypeScript,
  targeted ESLint, and the new parser tests all pass.

### 2026-08-28 — Audited study-guide tag merge

- Compared Excel tags with the 31 audited guides and confirmed that every covered
  verse had a difference, primarily because the guides supplied additional,
  more-specific discovery tags.
- Made the curriculum builder merge workbook and study-guide tags
  case-insensitively while preserving useful tags unique to either source.
- Added idempotent database migration and batched seed synchronization so both
  existing deployments and fresh curriculum resets receive the same canonical
  tag relationships without deleting learner data.
- Regenerated the curriculum and synchronized the local database. Verification
  reports 133 unique tags, 286 verse-tag relationships, zero malformed combined
  tag labels, and zero study-guide tags missing from canonical data.
- Consolidated those merged values into the single structured `Tag`/`VerseTag`
  source used throughout the app. Removed the duplicate `## Tags` blocks from
  canonical and persisted legacy study Markdown after the merge was secured.

### 2026-08-28 — Draft-safe structured verse bulk import

- Replaced the legacy single `studyNote` CSV column with dedicated columns for
  all eight structured Sanctuary study sections.
- Reduced the minimum import translation requirement to KJV; WEB, BSB, NIV, ESV,
  reflection, study sections, and tags can be completed later.
- Made a blank `isActive` cell resolve to an inactive draft while preserving
  strict rejection of unsupported status values and malformed Scripture ranges.
- Updated the admin import guidance, product contract, roadmap, and parser tests
  so the downloadable template and future bulk imports share one documented
  contract.

### 2026-08-29 — Phase 29 accepted

- The project owner marked Phase 29 — Seed Data complete and accepted.
- The canonical seed now provides 100 active verses, 400 active waypoint
  assignments, normalized KJV/WEB/BSB translations, 31 structured study guides,
  the existing 27-badge catalogue, and three Oil Shop hint packs.
- Phase 30 — Testing and QA is the next roadmap stage. Its final regression pass
  retains the previously deferred natural streak, restricted-stage hint, and
  mastered-verse Vault replay checks.

### 2026-08-29 — Phase 30 QA baseline opened

- Opened `docs/QA-CHECKLIST.md` as the durable result ledger for all 16 roadmap
  flows, deferred natural-time checks, automated evidence, and test-data safety.
- TypeScript, full ESLint, and all 99 non-database tests pass.
- Repository integration tests remain blocked by a dirty/unstable dedicated test
  database. The initial parallel attempt also confirmed these curriculum suites
  must run sequentially because each requires exclusive ownership of an empty
  temporary waypoint curriculum.
- Phase 30 remains in progress; no manual flow has been marked passed without
  project-owner verification.

### 2026-08-29 — Guarded integration database reset

- Added `npm run test:database:reset`, which requires the existing exact test
  acknowledgement and a PostgreSQL URL distinct from the application database.
- The reset performs one server-side application-table cleanup, preserves the
  migrated schema and `_prisma_migrations`, verifies that users and waypoints are
  empty, and never prints or shell-interpolates database credentials.
- Prisma currently refuses the dedicated hosted test-resource operation with
  `planLimitReached`. Repository integration checks remain Blocked—not Failed—
  until the workspace quota resets or the plan restriction is removed.

### 2026-08-29 — Phase 30 authentication flow passed

- The project owner manually verified registration, login, logout, repeat login,
  and the expected protected-route redirect behavior.
- Phase 30 manual Flow 1 is Passed. Flow 2 — admin route and role protection —
  is next.

### 2026-08-29 — Phase 30 admin protection flow passed

- The project owner manually verified that Player, Admin, and Super Admin
  accounts receive their intended route access.
- Phase 30 manual Flow 2 is Passed. Flow 3 — verse management — is next.

### 2026-08-29 — Phase 30 verse management flow passed

- The project owner manually verified the administrator verse-management flow
  and Player route protection.
- Phase 30 manual Flow 3 is Passed. Before Flow 4, curriculum administration is
  receiving a focused taxonomy and safe-placeholder cleanup correction.

### 2026-08-29 — Psalms, tags, and unused-waypoint correction

- Canonicalized the structured Bible book name to `Psalms` while retaining
  singular human-readable references such as `Psalm 23:1`. The checked-in
  curriculum generator and dataset now agree with the 66-book selector.
- Added and applied a non-destructive data migration to the local database. All
  ten matching local verses now store `Psalms`; references, assignments, and
  learner history were not changed.
- Standardized tag input to a case-insensitive slug identity with a consistent
  human-readable Title Case label. Case-only variants collapse before writes,
  and the local tag catalogue contains no case-duplicate records.
- Added administrator deletion for only the final hidden, unassigned waypoint
  with no learner history. The repository rechecks every condition under the
  curriculum advisory lock and records successful deletion in the audit log.
- Focused tag/import tests pass (5/5), TypeScript passes, targeted ESLint passes,
  and `git diff --check` reports no whitespace errors.

### 2026-08-29 — Hidden-waypoint unassignment

- Added a confirmation-gated Unassign control to the existing waypoint
  assignment dialog.
- A waypoint can be unassigned only while hidden and free of learner-linked
  progress, day progress, and game sessions. The repository rechecks these
  rules under the curriculum advisory lock before clearing the verse.
- Unassignment retains the waypoint, resets its provisional Journey Stage to
  `LEARN`, and records the previous verse and stage in the audit log.

### 2026-08-29 — Configurable verse-library columns

- Added Waypoints and Packs as optional columns in the administrative verse
  library. Waypoint cells show the waypoint number and Journey Stage; pack cells
  show the learning-pack names linked to the verse.
- Added a checklist menu that keeps the existing five information columns as
  the default and enforces a maximum of five visible information columns. Row
  actions remain permanently available and do not count toward the limit.
- Kept column selection inside a focused client component, so toggling columns
  performs no database request. The list repository loads only the relationship
  fields required by this screen.
- TypeScript, targeted ESLint, and whitespace validation pass.

### 2026-08-29 — Phase 30 waypoint assignment flow passed

- The project owner manually verified repeated verse assignment across distinct
  Journey Stages, correct administrative display, and guarded hidden-waypoint
  unassignment behavior.
- Phase 30 manual Flow 4 is Passed. Flow 5 — Journey Stage rules — is next.
