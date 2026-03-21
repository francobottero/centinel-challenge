import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";

type AuthNavbarProps = {
  name?: string | null;
  email?: string | null;
};

export function AuthNavbar({ name, email }: AuthNavbarProps) {
  return (
    <header className="mb-8 border-b border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.08)] md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-semibold text-white"
          >
            C
          </Link>

          <div>
            <p className="text-lg font-semibold">
              {name ?? "Unnamed user"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {email ?? "No email available"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
