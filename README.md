This project now includes email/password authentication with:

- `next-auth` for session handling
- `Prisma` for database access
- `PostgreSQL` as the default local database
- server-side registration via Next.js Server Functions

## Getting Started

1. Create an environment file:

```bash
cp .env.example .env
```

2. Make sure PostgreSQL is running locally and create the database:

```bash
createdb centinel
```

3. Generate the Prisma client and apply the checked-in migration:

```bash
npm run db:generate
npm run db:init
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then visit `/register` to create a user.

## Database

The default setup uses local PostgreSQL through Prisma:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/centinel?schema=public"
```

If your local Postgres user/password/port differ, update `DATABASE_URL` in `.env` to match your machine, then rerun `npm run db:init`.

## Auth Notes

- Users are stored in the database with hashed passwords.
- The app uses a credentials provider for login.
- The home page is protected and redirects unauthenticated users to `/login`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
