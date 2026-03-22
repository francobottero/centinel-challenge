type DismissibleAlertTone = "error" | "success";

type DismissibleAlertProps = {
  message: string;
  onDismiss: () => void;
  tone: DismissibleAlertTone;
};

const toneClassNames: Record<DismissibleAlertTone, string> = {
  error:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
};

const dismissButtonToneClassNames: Record<DismissibleAlertTone, string> = {
  error: "hover:bg-red-100 dark:hover:bg-red-900/40",
  success: "hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
};

export function DismissibleAlert({
  message,
  onDismiss,
  tone,
}: DismissibleAlertProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${toneClassNames[tone]}`}
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className={`shrink-0 rounded-full px-2 py-1 text-base leading-none transition ${dismissButtonToneClassNames[tone]}`}
      >
        x
      </button>
    </div>
  );
}
