/** Normalize Iraqi mobile numbers to 9647XXXXXXXXX */
function toAsciiDigits(value: string): string {
  return String(value || '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return ch;
  });
}

export function normalizeIraqiPhone(phone: string): string {
  const digits = toAsciiDigits(phone).replace(/\D/g, '');
  if (/^964(77|79|78|75)\d{8}$/.test(digits)) return digits;
  // +964 077XXXXXXXX — country code plus local leading zero
  if (/^9640(77|79|78|75)\d{8}$/.test(digits)) return `964${digits.slice(4)}`;
  if (/^0(77|79|78|75)\d{8}$/.test(digits)) return `964${digits.slice(1)}`;
  if (/^(77|79|78|75)\d{8}$/.test(digits)) return `964${digits}`;
  return digits;
}

/** Common stored formats for the same Iraqi number. */
/** Strip Arabic/Persian digits and non-digits from OTP input. */
export function normalizeOtpCode(code: string): string {
  return toAsciiDigits(code).replace(/\D/g, '');
}

export function iraqiPhoneVariants(phone: string): string[] {
  const normalized = normalizeIraqiPhone(phone);
  const variants = new Set<string>([normalized, phone.trim(), phone.replace(/\D/g, '')]);
  if (normalized.startsWith('964') && normalized.length === 13) {
    variants.add(`0${normalized.slice(3)}`);
    variants.add(normalized.slice(3));
  }
  return [...variants].filter(Boolean);
}
