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

#### Inspecting local data

Prisma remains the only ORM, schema authority, and migration system. DBeaver
Community may be used as a database viewer when Prisma Studio cannot introspect
Prisma Postgres Local. Connect DBeaver to PostgreSQL at `localhost:51214`, use
database `template1`, username/password `postgres`/`postgres`, and disable SSL.
Do not use DBeaver schema-editing tools in place of checked-in Prisma migrations.
Because DBeaver is only a client for the same PostgreSQL database, this workflow
does not create a second data format or require any later migration back to
Prisma.

#### Creating playable local fixtures

The production seed intentionally creates catalogues and hidden curriculum
placeholders only. To publish five KJV waypoints for local gameplay testing, run:

```bash
npm run local:fixtures
```

This command refuses hosted URLs and production mode before constructing Prisma
Client. It is idempotent while fixture waypoints have no learner history and
fails instead of overwriting progressed curriculum.

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
