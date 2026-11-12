const ExchangeRate = require("../models/ExchangeRate");

// Only cache rates for the currencies GoatLeads actually uses
const OUR_CURRENCIES = ["USD", "INR", "GBP", "CAD", "AED"];

// 24 hours in milliseconds — how long a cached rate is considered fresh
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Hardcoded approximate rates (1 USD = X units of currency).
// Used as the LAST resort when: the API is down AND there is nothing in MongoDB.
// These numbers are rough and will be outdated — the real API should always run.
const FALLBACK_RATES = { USD: 1, INR: 84.5, GBP: 0.79, CAD: 1.36, AED: 3.67 };

// In-memory cache — faster than a DB round-trip on every lead save.
// Cleared when the server restarts (that is fine; MongoDB cache takes over then).
let _memRates = null;
let _memFetchedAt = null;

// ─── getRates ─────────────────────────────────────────────────────────────────
// Returns a plain object like { USD: 1, INR: 84.5, GBP: 0.79, ... }
// Cache priority:  in-memory  >  MongoDB  >  live API  >  FALLBACK_RATES
const getRates = async () => {
  // 1. Is the in-memory cache still fresh? Return it immediately (no DB hit)
  if (_memRates && _memFetchedAt && Date.now() - _memFetchedAt < CACHE_TTL_MS) {
    return _memRates;
  }

  // 2. Is there a fresh document in MongoDB?
  const stored = await ExchangeRate.findOne().sort({ fetchedAt: -1 }).lean();
  if (stored && Date.now() - new Date(stored.fetchedAt).getTime() < CACHE_TTL_MS) {
    // Mongoose Map comes back as a plain object when using .lean()
    const rates = stored.rates instanceof Map
      ? Object.fromEntries(stored.rates)
      : stored.rates;

    // Warm the in-memory cache so the next call is even faster
    _memRates = rates;
    _memFetchedAt = new Date(stored.fetchedAt).getTime();
    return rates;
  }

  // 3. Fetch fresh rates from the exchange rate API
  try {
    // If EXCHANGE_RATE_API_KEY is set in .env → use the authenticated endpoint.
    // Otherwise → use open.er-api.com which is free and needs no key.
    const key = process.env.EXCHANGE_RATE_API_KEY;
    const url = key
      ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
      : `https://open.er-api.com/v6/latest/USD`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error(`API responded with HTTP ${res.status}`);

    const data = await res.json();

    // Both APIs put the rates in different keys — handle both shapes
    const raw = data.rates || data.conversion_rates;
    if (!raw) throw new Error("Unexpected API response — no 'rates' field");

    // Keep only the currencies we care about to save space
    const rates = { USD: 1 };
    OUR_CURRENCIES.forEach((c) => { if (raw[c]) rates[c] = raw[c]; });

    // 4. Persist to MongoDB so the next server restart can read from cache
    await ExchangeRate.create({ base: "USD", rates, fetchedAt: new Date() });

    console.log("[ExchangeRateService] Fresh rates fetched and cached:", rates);

    // 5. Warm in-memory cache
    _memRates = rates;
    _memFetchedAt = Date.now();

    return rates;
  } catch (err) {
    console.error("[ExchangeRateService] API fetch failed:", err.message);

    // 6. API failed — fall back to the last known DB rates if available
    if (stored) {
      console.warn("[ExchangeRateService] Using last known DB rates (may be stale).");
      return stored.rates instanceof Map
        ? Object.fromEntries(stored.rates)
        : stored.rates;
    }

    // 7. Nothing in the DB either — use hardcoded approximate rates
    console.warn("[ExchangeRateService] Using hardcoded fallback rates.");
    return FALLBACK_RATES;
  }
};

// ─── convertToBase ────────────────────────────────────────────────────────────
// Converts `amount` from `currency` to USD using the provided `rates` object.
// This is a SYNCHRONOUS function — call getRates() once before the loop,
// then call convertToBase() inside the loop without any extra await.
//
// Example:
//   const rates = await getRates();
//   convertToBase(500000, "INR", rates)  →  5917.16  (at rate 84.5)
//   convertToBase(100,    "USD", rates)  →  100
const convertToBase = (amount, currency, rates) => {
  if (currency === "USD") return amount; // already in base currency

  const rate = rates && rates[currency];
  if (!rate) {
    // Unknown currency — return raw amount so we don't lose the data
    console.warn(`[ExchangeRateService] No rate for ${currency}, storing raw amount.`);
    return amount;
  }

  // rates[currency] = "how many units of currency equal 1 USD"
  // To go from currency → USD:  divide by the rate
  return Math.round((amount / rate) * 100) / 100;
};

module.exports = { getRates, convertToBase };
