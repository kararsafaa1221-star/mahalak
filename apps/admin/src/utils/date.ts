export function getTimestampMillis(dateValue: unknown): number {
  if (!dateValue) return 0;
  const value = dateValue as { toMillis?: () => number; seconds?: number };
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  const parsed = Date.parse(String(dateValue));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseToDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  if (typeof dateValue.seconds === 'number') {
    return new Date(dateValue.seconds * 1000);
  }
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function formatSafeDate(
  dateValue: any,
  locale: string = 'ar-IQ',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '-'
): string {
  const d = parseToDate(dateValue);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    return fallback;
  }
}

export function formatSafeTimeString(
  dateValue: any,
  locale: string = 'ar-IQ',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '-'
): string {
  const d = parseToDate(dateValue);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString(locale, options);
  } catch (e) {
    return fallback;
  }
}

export function formatSafeDateTimeString(
  dateValue: any,
  locale: string = 'ar-IQ',
  options?: Intl.DateTimeFormatOptions,
  fallback: string = '-'
): string {
  const d = parseToDate(dateValue);
  if (!d) return fallback;
  try {
    return d.toLocaleString(locale, options);
  } catch (e) {
    return fallback;
  }
}

