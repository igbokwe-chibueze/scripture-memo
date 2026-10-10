This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Start the isolated local database

Routine development must not point at hosted Prisma Postgres. Start the named
local Prisma Postgres instance, copy `.env.example` to `.env`, and replace the
port in `DATABASE_URL` if the CLI prints a different one:

```bash
npx prisma dev --name scripture-memo --detach
npx prisma migrate deploy
npx prisma db seed
```

The local database persists between restarts. Use `npx prisma dev ls` to inspect
it and `npx prisma dev stop scripture-memo` when you intentionally want to stop
it. Keep hosted credentials in deployment configuration or an ignored backup,
never in the active development `.env`.

#### Local integration tests

The application keeps using `scripture-memo` on port **51214**. Disposable
integration fixtures use `scripture-memo-tests` on **51224**, backed by separate
local storage. Both use the existing Prisma installation; neither needs Cloud.
Changing only the database name on a Prisma Local URL does **not** isolate data.
The test guard requires local URLs, different ports, and explicit confirmation.

```bash
# Start the persistent test service; leave this terminal running during tests.
npm run local:test:start
```

In another terminal:

```bash
# Apply checked-in schema changes to TEST_DATABASE_URL only; never seed the app.
npm run test:database:migrate
# Run suites sequentially because they share disposable fixture tables.
npm run test:integration:all
```

The service was provisioned and migrated on 2026-09-14. After restarting the
computer, start it again only when running integration tests. It is not required
for login or ordinary development. `Ctrl+C` stops the foreground test service.
`npm run test:database:reset` clears **test data only**, preserving migrations;
use it only to remove failed fixture leftovers, not to repair missing migrations.

#### Multi-connection concurrency tests

Prisma Local serializes connections, so it cannot prove database lock behavior.
The concurrency runner starts PostgreSQL 16 in a disposable temporary directory,
binds only to loopback on an OS-assigned port, applies checked-in migrations to
that empty database, runs the guarded races, then stops the server and removes
the temporary data. It does not change `.env`, either Prisma Local instance, or
the hosted database. On Windows, run it from a regular non-administrator
terminal because PostgreSQL refuses to initialize as an administrator.

```bash
npm run test:concurrency:local
```

This runs auth login/registration limiter races, progression curriculum-lock
and duplicate day-completion races, gameplay submission and duplicate-mode
completion races, and Fellowship transfer, closure/suspension, and appeal races.
The `embedded-postgres` package is development-only; no Docker or machine-wide
PostgreSQL service is required. Hosted test credentials are never a fallback.
Production migration/data transfer remains a separate future deployment task;
test fixtures must never be transferred to production.

#### GitHub pull-request checks

GitHub Actions runs the quality checks and database-backed suites for every
pull request and pushed branch. `npm run test:unit` discovers database-free
tests under `features/`, `lib/`, and `i18n/`; repository tests run separately
against a temporary PostgreSQL 16 service provided only to the GitHub runner.
CI applies the checked-in migrations, resets only that disposable database
between fixture groups, and then runs repository, concurrency, and account
suspension integration coverage. It uses synthetic local environment values and
does not need `.env`, Resend credentials, Prisma Cloud, or either local database.

The workflow reports required check statuses, but GitHub does not automatically
block merges just because a workflow exists. To enforce the gate, enable branch
protection or a repository ruleset and require both **Lint, typecheck, unit
tests, and production build** and **PostgreSQL integration and concurrency
tests** to pass.

#### Production database plan

All application development continues against the existing local development
database on port 51214; do not reconnect routine development to a hosted
database or create another local development database. For production, the
project plans to reuse the previously provisioned Prisma-hosted PostgreSQL
database rather than create a replacement. At the initial production cutover,
its existing contents are intended to be replaced with a verified,
production-ready snapshot of the local release data. This is a deliberate,
one-time cutover operation, not an automatic sync: first back up the hosted
database, verify the target and the supported PostgreSQL transfer method, and
exclude local test fixtures, development-only accounts, and environment
secrets. `DATABASE_URL` selects a database but does not copy its data, and
`prisma migrate deploy` applies schema migrations but does not transfer records.
After production users begin creating data, production becomes its own source
of truth; never overwrite it with the development database.

#### Inspecting local data

Prisma remains the only ORM, schema authority, and migration system. DBeaver
Community may be used as a database viewer when Prisma Studio cannot introspect
Prisma Postgres Local. Connect DBeaver to PostgreSQL at `localhost:51214`, use
database `template1`, username/password `postgres`/`postgres`, and disable SSL.
Do not use DBeaver schema-editing tools in place of checked-in Prisma migrations.
Because DBeaver is only a client for the same PostgreSQL database, this workflow
does not create a second data format or require any later migration back to
Prisma.

#### Seeding the curriculum and local fixtures

On a fresh database, `npx prisma db seed` installs the approved curriculum:
100 active verses and 400 active waypoint assignments, along with the study
guides, badges, and Oil Shop hint-pack catalogue. The curriculum includes KJV,
WEB, and BSB translations; 31 verses have structured study guides, while the
remaining 69 intentionally have no study material yet. The seed creates
catalogue content, not player accounts. On reruns it inserts missing curriculum
records without overwriting existing verse or waypoint assignments.

`npm run local:fixtures` is a separate development-only helper for test
scenarios that need a known set of five KJV verse assignments at waypoints 1–5.
It replaces those assignments only while those waypoints have no learner
history. It is not needed to publish waypoints in a freshly seeded database.
The command refuses hosted URLs and production mode before constructing Prisma
Client:

```bash
npm run local:fixtures
```

It fails rather than replacing any of the five assignments after learner
history exists.

Register test accounts through the application so Better Auth remains the only
owner of credentials. After registration, select KJV during onboarding or run
the guarded player-preparation command, optionally granting a local admin role:

```bash
npm run local:player -- test@example.com
npm run local:player -- admin@example.com --admin
```

Player preparation creates or repairs only application profile, settings,
streak, and first-waypoint state. It never creates or changes passwords, Better
Auth accounts, or sessions. Neither local fixture command is part of production
deployment or `prisma db seed`.

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Testing on a physical device

The development server permits the repository's current LAN test origin,
`http://192.168.100.11:3000`. If the computer's LAN address changes, set a
comma-separated development-only override before restarting the server:

```env
DEV_ALLOWED_ORIGINS=http://192.168.100.25:3000
```

The phone and development computer must be connected to the same network, and
the operating-system firewall must allow inbound traffic to port 3000. Never add
production domains to this development override; production origins belong in
the deployment's Better Auth configuration.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
