/** Normalize Iraqi mobile numbers to 9647XXXXXXXXX */
export function normalizeIraqiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (/^964(77|79|78|75)\d{8}$/.test(digits)) return digits;
  if (/^0(77|79|78|75)\d{8}$/.test(digits)) return `964${digits.slice(1)}`;
  if (/^(77|79|78|75)\d{8}$/.test(digits)) return `964${digits}`;
  return digits;
}

/** Common stored formats for the same Iraqi number. */
export function iraqiPhoneVariants(phone: string): string[] {
  const normalized = normalizeIraqiPhone(phone);
  const variants = new Set<string>([normalized, phone.trim(), phone.replace(/\D/g, '')]);
  if (normalized.startsWith('964') && normalized.length === 13) {
    variants.add(`0${normalized.slice(3)}`);
    variants.add(normalized.slice(3));
  }
  return [...variants].filter(Boolean);
}
