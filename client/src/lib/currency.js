export const FALLBACK_CURRENCY_RATES = {
  USD: 1,
  INR: 84.5,
  GBP: 0.79,
  CAD: 1.36,
  AED: 3.67,
};

export const CURRENCY_SYMBOLS = {
  USD: "$",
  INR: "₹",
  GBP: "£",
  CAD: "CA$",
  AED: "AED ",
};

/**
 * Converts a USD base amount into the target display currency using live or fallback rates.
 */
export function formatCurrencyFromUsd(
  usdAmount = 0,
  targetCurrency = "USD",
  rates = FALLBACK_CURRENCY_RATES
) {
  const rate = rates?.[targetCurrency] ?? FALLBACK_CURRENCY_RATES[targetCurrency] ?? 1;
  const converted = (Number(usdAmount) || 0) * rate;
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || "$";

  return `${symbol}${converted.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

