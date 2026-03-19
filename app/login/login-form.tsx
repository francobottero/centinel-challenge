"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    startTransition(() => {
      void (async () => {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/",
        });

        if (result?.error) {
          setError("Incorrect email or password.");
          return;
        }

        router.push(result?.url ?? "/");
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Login"}
      </button>

      <p className="text-sm text-[var(--muted)]">
        Need an account?{" "}
        <Link href="/register" className="font-semibold text-[var(--accent)]">
          Create one
        </Link>
      </p>
    </form>
  );
}
