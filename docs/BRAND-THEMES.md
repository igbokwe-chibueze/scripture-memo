# Brand theme implementation

Brand themes change the app's semantic color values only. The shared design
system in `app/globals.css` continues to own fonts, shapes, spacing, controls,
animations, and component behavior. The player's separate Light, Dark, or System
preference remains controlled by `next-themes` and the `dark` class.

## Adding a theme

1. Add one CSS file under `app/themes/` with light and dark token selectors that
   follow the existing structure in `tropical-teal.css`:
   `:root[data-brand-theme="<id>"]` and
   `:root.dark[data-brand-theme="<id>"]`.
2. Supply every token checked by `scripts/design-system.test.ts` in both modes.
   Use the existing semantic roles; do not add component-specific tokens or
   change typography, spacing, shapes, animation, or component rules.
3. Import the new file from `app/globals.css` and register its stable identifier,
   name, and description in `features/brand-themes/constants/brand-themes.ts`.
   Registration makes the theme eligible for Super Admin preview and selection.
4. Run `npm run test:design-system`. This checks token coverage, WCAG AA
   contrast for semantic text pairs, and 3:1 contrast for input/focus colors
   against key surfaces before the theme is selectable. Resolve any missing
   token or contrast failure in the theme palette before registration.
5. Do not change `DEFAULT_BRAND_THEME_ID` when adding an option. Tropical Teal
   remains the default until a Super Admin explicitly applies another theme.

The Super Admin control is at `/admin/settings`. A temporary preview follows
that administrator's browser across routes and refreshes for up to one hour.
It does not change the live database setting, and the administrator can cancel
it at any time. Applying a theme globally clears the preview, validates the
choice server-side, checks the Super Admin role, and records the change in the
audit log. The selected ID is stored in `PlatformSettings`; the root layout
reads it once per server request and safely falls back to Tropical Teal if the
database is temporarily unavailable.
