# Luna Mascot Assets

Luna is Scripture Memo's sheep guide. Her approved identity uses cream wool, a
warm charcoal face and limbs, amber eyes, rounded upright proportions, and a
golden flame pendant. Future poses must preserve those traits and remain within
the application's shared cream, charcoal, amber, gold, and restrained-violet
palette.

## Production poses

| File | Intended use |
|---|---|
| `luna-guide.png` | Onboarding, feature introductions, and directional guidance |
| `luna-celebrate.png` | Mode, day, waypoint, badge, and streak celebrations |
| `luna-encourage.png` | Hints, learning prompts, and positive reinforcement |
| `luna-loading.png` | Game-styled loading and waiting states |
| `luna-retry.png` | Incorrect answers, recoverable errors, and retry prompts |
| `luna-reward.png` | Glow Points, badges, unlocks, and reward presentation |
| `luna-avatar.png` | Favicon master, profile-scale mascot avatar, and compact brand marks |
| `luna-worried.png` | Caring early warning that a streak needs attention |
| `luna-disappointed.png` | Compassionate acknowledgement after a missed streak |
| `luna-angry.png` | Urgent final reminder; determined at protecting the flame, never hostile toward the player |
| `luna-notification-worried.png` | Compact early streak warning for push notifications and widgets |
| `luna-notification-disappointed.png` | Compact post-reset acknowledgement for push notifications and widgets |
| `luna-notification-angry.png` | Compact final-window streak warning with determined urgency |

All production files are transparent 1024×1536 PNGs. The preserved chroma-key
generations live in `sources/` so edge processing can be repeated without
quality loss. Do not use the source files directly in the interface.

## Usage rules

- Keep Luna's proportions intact; use `object-contain` and never stretch her.
- Give her enough surrounding space that ears, hooves, and gestures remain
  readable at mobile sizes.
- Match the pose to the message. Do not use celebration art for errors or the
  retry pose for punitive feedback.
- Treat Luna as a supportive guide, never as a source of shame, pressure, or
  interruption during Scripture study.
- Escalate streak-reminder emotion intentionally: worried for an early reminder,
  angry/determined only for the final urgent window, and disappointed only after
  a streak has actually reset. Notification copy must remain encouraging.
- Use `luna-notification-*` close-ups for push notifications and compact widgets.
  Reserve the corresponding full-body assets for larger in-app cards, modals,
  and screens where the complete pose remains readable.
- Prefer these approved assets before generating another pose. New poses should
  use the approved concept and these production files as identity references.
