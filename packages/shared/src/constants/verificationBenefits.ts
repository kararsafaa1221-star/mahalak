/** Admin-managed copy for «مميزات الحساب الموثّق» on the merchant verification page.
 *  Stored in settings/global.verificationBenefits (and optional title fields). */

export interface VerificationBenefitItem {
  id: string;
  textAr: string;
  textCkb?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface VerificationBenefitsConfig {
  titleAr: string;
  titleCkb?: string;
  items: VerificationBenefitItem[];
}

export const DEFAULT_VERIFICATION_BENEFITS_TITLE_AR = 'مميزات الحساب الموثّق';
export const DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB = 'سوودەکانی هەژماری پشتڕاستکراو';

export const DEFAULT_VERIFICATION_BENEFITS: VerificationBenefitItem[] = [
  {
    id: 'benefit_badge',
    textAr: 'شارة زرقاء رسمية بجانب اسم متجرك في كل مكان',
    textCkb: 'نیشانەی شین فەرمی لە تەنیشت ناوی دوکانەکەت لە هەموو شوێنێک',
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'benefit_filter',
    textAr: 'الظهور في فلتر «موثّق فقط» وقائمة المتاجر الموثقة',
    textCkb: 'دەرکەوتن لە فلتەری «تەنها پشتڕاستکراو» و لیستی فرۆشگا پشتڕاستکراوەکان',
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'benefit_priority',
    textAr: 'أولوية ترتيب في القوائم والمنتجات والإعلانات',
    textCkb: 'پێشەنگی ڕیزکردن لە لیست، بەرهەم و ڕێکلامەکان',
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'benefit_trust',
    textAr: 'رسالة ثقة للزبون عند إتمام الطلب من متجرك',
    textCkb: 'پەیامی متمانە بۆ کڕیار لە کاتی تەواوکردنی داواکاری لە دوکانەکەت',
    sortOrder: 4,
    enabled: true,
  },
];

export function createNewVerificationBenefitId(): string {
  return `benefit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeBenefitItem(
  raw: Partial<VerificationBenefitItem>,
  fallback?: VerificationBenefitItem,
): VerificationBenefitItem | null {
  const id = String(raw.id ?? fallback?.id ?? '').trim();
  if (!id) return null;
  const textAr = String(raw.textAr ?? fallback?.textAr ?? '').trim();
  if (!textAr) return null;
  return {
    id,
    textAr,
    textCkb: String(raw.textCkb ?? fallback?.textCkb ?? '').trim() || undefined,
    enabled: raw.enabled !== false,
    sortOrder: Number(raw.sortOrder ?? fallback?.sortOrder ?? 99) || 99,
  };
}

export function resolveVerificationBenefitsConfig(
  adminSettings?: Record<string, unknown> | null,
): VerificationBenefitsConfig {
  const titleAr =
    typeof adminSettings?.verificationBenefitsTitleAr === 'string' &&
    adminSettings.verificationBenefitsTitleAr.trim()
      ? adminSettings.verificationBenefitsTitleAr.trim()
      : DEFAULT_VERIFICATION_BENEFITS_TITLE_AR;
  const titleCkb =
    typeof adminSettings?.verificationBenefitsTitleCkb === 'string' &&
    adminSettings.verificationBenefitsTitleCkb.trim()
      ? adminSettings.verificationBenefitsTitleCkb.trim()
      : DEFAULT_VERIFICATION_BENEFITS_TITLE_CKB;

  const raw = Array.isArray(adminSettings?.verificationBenefits)
    ? (adminSettings!.verificationBenefits as unknown[])
    : [];

  if (raw.length === 0) {
    return {
      titleAr,
      titleCkb,
      items: DEFAULT_VERIFICATION_BENEFITS.map((b) => ({ ...b })),
    };
  }

  const items: VerificationBenefitItem[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const normalized = normalizeBenefitItem(item as Partial<VerificationBenefitItem>);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    items.push(normalized);
  }

  return {
    titleAr,
    titleCkb,
    items: items.length > 0 ? items : DEFAULT_VERIFICATION_BENEFITS.map((b) => ({ ...b })),
  };
}

/** Enabled benefits sorted for merchant display. */
export function resolveEnabledVerificationBenefits(
  adminSettings?: Record<string, unknown> | null,
): VerificationBenefitItem[] {
  return resolveVerificationBenefitsConfig(adminSettings)
    .items.filter((b) => b.enabled !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export function localizeVerificationBenefitText(
  item: VerificationBenefitItem,
  language?: string,
): string {
  const lang = (language || 'ar').toLowerCase();
  if ((lang === 'ckb' || lang.startsWith('ckb') || lang === 'ku') && item.textCkb?.trim()) {
    return item.textCkb.trim();
  }
  return item.textAr;
}

export function localizeVerificationBenefitsTitle(
  config: Pick<VerificationBenefitsConfig, 'titleAr' | 'titleCkb'>,
  language?: string,
): string {
  const lang = (language || 'ar').toLowerCase();
  if ((lang === 'ckb' || lang.startsWith('ckb') || lang === 'ku') && config.titleCkb?.trim()) {
    return config.titleCkb.trim();
  }
  return config.titleAr;
}
