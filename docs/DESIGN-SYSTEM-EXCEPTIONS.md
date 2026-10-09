# Design system exceptions

The shared semantic palette applies to interface controls, surfaces, feedback,
and text. These narrowly scoped cases retain direct color values for a specific
reason; the style guard must not treat them as general permission for other UI.

| File | Allowed exception | Reason |
| --- | --- | --- |
| `features/profile/components/player-avatar.tsx` | The six named avatar-finish gradients and their shadows | These are player-selected cosmetic finishes. Their color is the appearance of the collectible, not a control, status, or page palette. |
| `features/gameplay/components/animated-flame.tsx` | SVG gradient stops and flame fill | These values draw the established flame illustration and must remain independent of theme color roles. |
| `features/auth/lib/email-verification-delivery.ts` | Email HTML foreground `#16333B` | Email clients need a literal fallback color; theme variables are not reliable in standalone email markup. This matches the shared deep-ink foreground. |
| `features/auth/lib/password-reset-production-delivery.ts` | Email HTML foreground `#16333B` | Email clients need a literal fallback color; theme variables are not reliable in standalone email markup. This matches the shared deep-ink foreground. |

Add an exception only for an asset or output format that cannot consume the
shared tokens. Keep the file and reason specific, and do not use an exception to
preserve ordinary screen styling.
