import { redirect } from "next/navigation";

import { LogoutButton } from "@/app/components/logout-button";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
              Protected Area
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Authentication is now wired into the app.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              This page only renders for authenticated users. Your account lives
              in the database and your session is handled by NextAuth.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-sm font-medium text-[var(--muted)]">Signed in as</p>
            <p className="mt-3 text-2xl font-semibold">
              {session.user.name ?? "Unnamed user"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {session.user.email}
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-sm font-medium text-[var(--muted)]">Stack</p>
            <p className="mt-3 text-2xl font-semibold">Next.js + Prisma</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Credentials-based auth with password hashing and a persistent user
              model.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
