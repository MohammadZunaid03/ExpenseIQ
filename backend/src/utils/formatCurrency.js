const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new TypeError("Amount must be a finite number.");
  }

  return currencyFormatter.format(amount);
}
