import { forwardRef, type ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;
type TextareaProps = ComponentPropsWithoutRef<"textarea">;

const fieldBaseClassName =
  "block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 disabled:text-[var(--muted)] read-only:text-[var(--muted)]";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={joinClassNames(fieldBaseClassName, className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={joinClassNames(fieldBaseClassName, className)}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
