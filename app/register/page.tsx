import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/app/register/register-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-[var(--surface-strong)] px-8 py-10 md:px-12 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            Centinel
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Create your account.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
            New users are stored in the database with a hashed password and can
            sign in immediately afterward.
          </p>
          <div className="mt-10 rounded-[1.5rem] border border-[var(--border)] bg-[var(--background)]/70 p-6">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Persistence
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Prisma writes the user record to SQLite by default, so your auth
              flow is ready for local development from the start.
            </p>
          </div>
        </div>

        <div className="px-8 py-10 md:px-12 md:py-14">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Register</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create a new email/password account.
              </p>
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--accent)]"
            >
              Login
            </Link>
          </div>

          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
