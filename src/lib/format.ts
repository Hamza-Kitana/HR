/** Always Latin digits + English date/time, even when UI language is Arabic. */
export const DISPLAY_LOCALE = "en-GB";

function asDate(input: Date | string | number) {
  return input instanceof Date ? input : new Date(input);
}

export function formatDate(
  input: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  try {
    return asDate(input).toLocaleDateString(DISPLAY_LOCALE, options);
  } catch {
    return String(input);
  }
}

export function formatDateTime(
  input: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
) {
  try {
    return asDate(input).toLocaleString(DISPLAY_LOCALE, options);
  } catch {
    return String(input);
  }
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  try {
    return value.toLocaleString(DISPLAY_LOCALE, options);
  } catch {
    return String(value);
  }
}
