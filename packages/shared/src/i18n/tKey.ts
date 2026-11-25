import i18n from '../i18n';

/** Translate with fallback when key is missing or equals the path */
export function tKey(key: string, fallback: string, vars?: Record<string, string | number>): string {
  const value = i18n.t(key, { ...(vars || {}), defaultValue: '' });
  if (!value || value === key) return fallback;
  return value;
}
