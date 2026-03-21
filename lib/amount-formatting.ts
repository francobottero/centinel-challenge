export function formatExpenseAmount(
  amount: string | number | null | undefined,
) {
  if (amount === null || amount === undefined || amount === "") {
    return null;
  }

  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(numericAmount)) {
    return null;
  }

  return `$${new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)}`;
}
