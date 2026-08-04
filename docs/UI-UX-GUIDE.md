# Scripture Memo UI/UX Guide

**Status:** Active implementation guide  
**Authority:** `AGENTS.md` remains the repository's highest implementation
authority. This guide explains how to apply its UI/UX rules consistently. If the
two conflict, stop and follow `AGENTS.md`.

## 1. Product Experience

Scripture Memo is a calm, devotional mobile game. It is not a conventional SaaS
dashboard with game decoration added afterward.

Player-facing work should feel:

- tactile, focused, encouraging, and visually alive;
- mobile-first at a 375px viewport;
- recognizably part of one continuous game world;
- concise, with visuals carrying more meaning than paragraphs;
- accessible in light, dark, system, touch, keyboard, and reduced-motion use.

Desktop expands the same game experience. It must not replace it with dense
dashboard chrome. Administrative pages may prioritize operational clarity, but
must preserve the application's typography, palette, controls, and feedback.

## 2. Sources of Truth

Use these references in order:

1. `AGENTS.md` for mandatory implementation and accessibility rules.
2. This guide for visual and interaction application.
3. `/ui-foundation` for approved components and interactive treatments running
   in the real application.
4. `docs/PRODUCT-OVERVIEW.md` for feature-specific product requirements.
5. Approved screenshots supplied by the project owner for the particular view.

`docs/codex-history/PROJECT-LOG.md` records history. It is not a design-system
reference and should not be searched to reconstruct current styling.

## 3. Theme and Surface Integrity

### 3.1 Semantic tokens first

Build reusable surfaces from the semantic tokens defined by the application
theme: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`,
`muted`, `accent`, `border`, `ring`, and their foreground counterparts.

Do not combine a hardcoded dark page with light-theme semantic components. A
screen must either:

- fully respect the active Light, Dark, or System theme; or
- deliberately scope the complete dark/light token set for an immersive surface.

Setting only `bg-slate-950` and `text-white` does not create a valid dark theme.
Before changing a component that looks wrong, inspect in this order:

```text
Theme context → page surface → semantic tokens → shared component → variant → local override
```

### 3.2 One application palette

The established application language uses restrained amber/orange warmth,
violet depth, emerald success, blue informational feedback, and neutral slate
surfaces. Feature identity comes from composition, illustration, iconography,
and restrained accents—not unrelated page-level palettes.

Use semantic feedback consistently:

| Meaning | Treatment |
|---|---|
| Success/correct | Emerald or green |
| Error/incorrect | Red |
| Information/focus | Blue |
| Selection/swap | Violet or purple |
| Available movable item | Amber or yellow |
| Locked/cooldown | Muted neutral |

Never introduce a new feature palette merely to make a page look distinctive.

## 4. Standard Page Compositions

### Player page

- Use one obvious primary purpose.
- Lead with progress, artwork, or the next meaningful action.
- Keep secondary information compact and visually subordinate.
- Prefer a focused column on mobile and expand purposefully on desktop.

### Gameplay page

- Prioritize the current challenge above navigation and explanation.
- Keep mode progress, timer, hints, audio, and exit controls predictable.
- Prevent background scrolling while blocking celebrations or dialogs are open.
- Avoid dashboard grids and unnecessary chrome.

### Celebration page

- Use a strong visual entrance, concise result, reward feedback, and one clear
  continuation action.
- Do not close automatically unless the approved product behavior says so.
- Respect reduced motion and audio preferences.

### Shop page

- Present items as game inventory, not ecommerce table rows.
- Keep balances visible and purchases visually rewarding.
- Use the shared game palette even when item art introduces accent colors.

### Administration page

- Favor clarity, searchability, validation, and safe pending states.
- Retain the shared palette, typography, buttons, dialogs, and responsive rules.

## 5. Buttons and Navigation Controls

Behavior differs; appearance does not:

| Component | Use |
|---|---|
| `<Button>` | Immediate client action |
| `<LoadingButton>` | Asynchronous form or mutation action |
| `<NavigationButton>` | Route navigation with immediate pending feedback |

For matching `variant` and `size`, all three must receive the same colors,
border, bevel, shadow, typography, hover, press, focus, disabled, and
reduced-motion behavior from shared `buttonVariants`.

Rules:

- Use approved variants rather than restyling buttons locally.
- A screen may control width, grid placement, and approved size.
- Do not add local shadows, transforms, bevels, press animations, or conflicting
  foreground/background colors.
- Back navigation uses `<NavigationButton>` with a back icon and visible button
  treatment. It must not look like an unstyled text link.
- Close controls use the shared dialog/sheet button, remain opaque against their
  surface, include an accessible label, and measure at least 44×44 CSS pixels.
- Icon and label must be aligned through the shared component layout.
- Disabled and pending controls must not retain an apparently active state.

When a button looks inconsistent, compare its variant, theme context, and local
classes before changing `components/ui/button.tsx`.

## 6. Cards and Containers

- Use established rounded geometry and clear internal spacing.
- Depth must communicate hierarchy, not decorate every surface equally.
- Avoid cards touching viewport edges on mobile; preserve intentional horizontal
  margins and safe-area space.
- Prevent content, artwork, and controls from clipping at 375px.
- Do not mix several unrelated border, radius, and shadow systems on one page.
- Keep decorative backgrounds behind content and preserve readable contrast.

## 7. Typography and Copy Density

- One clear page heading.
- Use the heading family for major game moments and hierarchy.
- Keep player-facing labels and instructions short.
- Prefer icons, progress, animation, and composition over explanatory paragraphs.
- Remove repeated headings, subtitles, and instructions that communicate the
  same thing.
- Supporting prose is appropriate only when it prevents genuine confusion,
  communicates an important rule, or is required for accessibility.
- Never put punctuation fragments into draggable word-bank content.

## 8. Navigation

- Mobile primary navigation uses the approved bottom game navigation.
- Desktop may use the approved larger-screen shell without changing feature
  identity or route terminology.
- Route-changing controls always provide immediate feedback through
  `<NavigationButton>` or the navigation shell's approved pending behavior.
- Preserve deep links and resumable flows through authentication and onboarding.
- Do not provide two differently labelled controls that lead to the same route.

## 9. Dialogs, Drawers, and Blocking Screens

- Use a centered dialog on larger screens when the content is compact.
- Use a bottom drawer or approved side panel on mobile when it better preserves
  space and reachability.
- A mobile bottom drawer slides up on open and down on close.
- Blocking dialogs lock background scrolling.
- Close buttons use the shared tactile treatment; do not recreate an `X` locally.
- Destructive actions require clear confirmation and state their consequence.
- Do not place infrequent settings operations in frequently used action dialogs.

## 10. Motion, Audio, and Physical Feedback

- Motion should communicate state, weight, direction, or reward.
- Buttons visibly press toward the surface on touch and pointer activation.
- Cards may use spring entrances where approved, with enough duration to read as
  weight rather than a flash.
- Dragging must not introduce page scrollbars or disorienting viewport movement.
- Completion audio, pickup/drop feedback, errors, and ambient effects must use
  `useAudioFeedback()` and honor the saved audio preference.
- Reduced motion removes nonessential transforms and particles without hiding
  state changes or disabling timing rules.

## 11. Luna

- Luna supports loading, recoverable errors, empty states, reminders, and selected
  completion moments approved by the project owner.
- Use the approved pose for the emotional context.
- Notification/widget artwork favors readable close-ups; full-body artwork is
  reserved for compositions where space supports it.
- Luna is not mandatory decoration. Do not add her to a screen merely to fill
  empty space or weaken an already clear visual hierarchy.

## 12. Required Interaction States

Every interactive feature must account for:

| State | Expected treatment |
|---|---|
| Route loading | Route-group loading screen |
| Data loading | Skeleton or shared spinner |
| Pending action | Disabled tactile control with spinner and concise label |
| Success | Visual result plus Sonner success feedback where applicable |
| Error | Recoverable state and persistent Sonner error |
| Empty | Purposeful visual empty state with useful next action |
| Disabled | Visibly inactive and genuinely non-interactive |

Never leave a blank, frozen, silently failing, or repeatedly clickable interface.

## 13. Responsive and Accessibility Baseline

- Start at 375px, then test tablet and large desktop.
- Treat unprefixed layout utilities as the finished mobile composition. Add
  breakpoint-prefixed utilities only after the 375px hierarchy, spacing,
  wrapping, touch targets, and content order are correct.
- Never design the desktop arrangement first and rely on later overrides to
  squeeze it onto a phone. When the layouts need different structures, favor
  the mobile reading order and progressively enhance it for larger screens.
- Minimum interactive target: 44×44 CSS pixels.
- Support keyboard navigation and visible focus.
- Supply accessible names for icon-only controls.
- Preserve readable contrast in both themes.
- Respect safe areas, zoom, content reflow, and reduced motion.
- Drag & Drop and Puzzle require tap-select/tap-place alternatives.
- Swap requires tap-select/tap-swap behavior.
- Cue and Fill must work with mobile keyboards and exact input limits.

## 14. Manual UI Acceptance Checklist

Automated screenshot regression testing is deliberately deferred until the main
functionality is complete. It is not required for current phase acceptance.

Before handing off a new or changed player-facing screen, verify:

### Theme

- [ ] Light theme is coherent.
- [ ] Dark theme is coherent.
- [ ] System theme resolves correctly.
- [ ] No hardcoded surface conflicts with semantic component tokens.

### Responsive layout

- [ ] 375px mobile has intentional side margins.
- [ ] No horizontal overflow, clipping, or surprise scrollbars.
- [ ] Tablet and desktop expand the game experience appropriately.
- [ ] Fixed controls respect safe areas and do not cover content.

### Interaction

- [ ] Buttons match `/ui-foundation` in rest, hover, press, disabled, and pending states.
- [ ] Navigation gives immediate loading feedback.
- [ ] Back and close controls are tactile, visible, and at least 44×44.
- [ ] Modal/drawer motion and background scroll behavior are correct.

### Feedback and accessibility

- [ ] Loading, success, error, empty, pending, and disabled states exist.
- [ ] Keyboard focus and accessible names are present.
- [ ] Audio and reduced-motion settings are honored.
- [ ] Player-facing copy is concise and non-redundant.

## 15. Future Visual Regression Testing

After primary functionality stabilizes, reconsider a small Playwright screenshot
suite for only the highest-risk shared surfaces. Start with theme foundations,
buttons, gameplay shell, invitation/authentication, completion screens, and
mobile navigation. Baselines must be approved by the project owner and should
not be updated merely to silence a failed test.
