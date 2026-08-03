# Localization

Scripture Memo currently ships its player experience in English (`en`) and
Spanish (`es`). Administrative tools remain English-only until their product
copy and operational terminology receive a separate translation review.

## Locale resolution

Private player URLs do not include a locale segment. Keeping stable routes such
as `/game/map` avoids multiplying protected routes and prevents language changes
from interrupting an active session. On each request the app resolves language
in this order:

1. The authenticated account's `UserSettings.locale` value.
2. The secure `scripture-memo-locale` cookie.
3. A supported language in the browser's `Accept-Language` header.
4. English.

Changing language in Settings persists both the account preference and cookie,
updates the document `lang`, and revalidates the player layout. The preference
therefore follows an authenticated player across devices while the cookie gives
anonymous and signed-out screens a sensible language.

Public, indexable marketing pages may adopt locale-prefixed URLs later (for
example `/es/about`) because search engines need one canonical URL per language.
That future public routing choice does not require private gameplay URLs to
change.

## Interface language versus Bible translation

Interface locale and preferred Bible translation are separate settings. Locale
controls navigation, instructions, buttons, errors, dates, and celebrations.
Bible translation controls the canonical Scripture text used for study and
gameplay. Changing Spanish UI must never silently switch NIV, ESV, or KJV.

Admin-authored content such as badge names, shop-item descriptions, reflections,
study notes, and Bible text remains database content. Supporting translated
versions of that content requires explicit localized content records; it must not
be machine-translated at render time.

## Adding another language

1. Add its locale code to `SUPPORTED_LOCALES` in `i18n/config.ts`.
2. Copy `messages/en.json` to `messages/<locale>.json` and translate values
   without changing keys or ICU placeholders.
3. Add the language option in the Settings language selector.
4. Extend `localeFromAcceptLanguage` so the browser can detect it.
5. Run `npm run test:i18n`, TypeScript, lint, and a 375px manual pass.
6. Verify pluralization, number/date formatting, overflow, screen-reader labels,
   and gameplay instructions with a native reviewer.

The message-contract test rejects missing or extra keys, making incomplete
locale files fail before release.
