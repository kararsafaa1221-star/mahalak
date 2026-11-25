/** Normalize raw username (no @). */
export function bareStoreUsername(username?: string | null): string {
  return String(username || '')
    .trim()
    .replace(/^@+/, '');
}

/** Display handle like `@shopname`, or empty if missing. */
export function formatStoreUsername(username?: string | null): string {
  const bare = bareStoreUsername(username);
  return bare ? `@${bare}` : '';
}
