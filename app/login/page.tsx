import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
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
            Welcome back.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
            Sign in with the email and password stored in your database-backed
            account.
          </p>
          <div className="mt-10 rounded-[1.5rem] border border-[var(--border)] bg-[var(--background)]/70 p-6">
            <p className="text-sm font-medium text-[var(--foreground)]">
              App flow
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Register a user, store them in Prisma, then protect the app with a
              session-aware home page.
            </p>
          </div>
        </div>

        <div className="px-8 py-10 md:px-12 md:py-14">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Login</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Use your credentials to continue.
              </p>
            </div>
            <Link
              href="/register"
              className="text-sm font-medium text-[var(--accent)]"
            >
              Register
            </Link>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
