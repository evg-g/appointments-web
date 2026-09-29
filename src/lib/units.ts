/** Domain value formatting: temperature, money, durations. Kept pure for easy unit testing. */

/** Temperature in °C to one decimal, e.g. "4.2 °C". `null` renders as an em dash. */
export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "—";
  return `${celsius.toFixed(1)} °C`;
}

export function formatBattery(pct: number | null): string {
  if (pct === null) return "—";
  return `${String(Math.round(pct))}%`;
}

/**
 * Minor-unit money to a localized currency string, e.g. (4500, "USD") -> "$45.00".
 * Falls back to a plain amount if the currency code is not recognised.
 */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** Duration in minutes to a compact "1h 30m" / "45m" / "2h" label. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`;
}
