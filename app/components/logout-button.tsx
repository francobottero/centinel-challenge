"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-transparent hover:bg-black/5 dark:hover:bg-white/10"
    >
      Log out
    </button>
  );
}
