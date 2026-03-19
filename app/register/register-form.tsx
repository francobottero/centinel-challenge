"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerUser, type RegisterState } from "@/app/actions/auth";

const initialState: RegisterState = {};

function SubmitButton() {
  return (
    <button
      type="submit"
      className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)]"
    >
      Create account
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerUser, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {pending ? "Creating account" : ""}
      </div>

      <SubmitButton />

      <p className="text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--accent)]">
          Login
        </Link>
      </p>
    </form>
  );
}
