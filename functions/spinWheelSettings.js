/**
 * Server-side spin wheel settings resolver (mirrors packages/shared spinWheelSettings).
 */

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

const DEFAULT_OPTIONS = [
  { id: 'sw_pts_50', label: '50 نقطة', weight: 28, enabled: true, color: '#7B3DFF', prizeType: 'points', points: 50 },
  { id: 'sw_pts_100', label: '100 نقطة', weight: 18, enabled: true, color: '#0B1320', prizeType: 'points', points: 100 },
  { id: 'sw_pts_200', label: '200 نقطة', weight: 10, enabled: true, color: '#EAB308', prizeType: 'points', points: 200 },
  {
    id: 'sw_promo_5k',
    label: 'خصم 5,000 د.ع',
    weight: 8,
    enabled: true,
    color: '#0EA5E9',
    prizeType: 'promo_amount',
    discountValue: 5000,
    promoValidityDays: 14,
  },
  {
    id: 'sw_promo_10pct',
    label: 'خصم 10%',
    weight: 6,
    enabled: true,
    color: '#F43F5E',
    prizeType: 'promo_percent',
    discountValue: 10,
    promoValidityDays: 14,
  },
  { id: 'sw_nothing', label: 'حظ أوفر', weight: 30, enabled: true, color: '#10B981', prizeType: 'nothing' },
];

const DEFAULT_SETTINGS = {
  enabled: true,
  title: 'عجلة الحظ',
  subtitle: 'أدِر العجلة واربح نقاطاً أو أكواد خصم فورية',
  spinButtonLabel: 'تدوير العجلة',
  costPoints: 0,
  dailyLimit: 3,
  resetPeriodHours: 24,
  options: DEFAULT_OPTIONS,
};

function normalizePrizeType(value) {
  if (
    value === 'points' ||
    value === 'promo_amount' ||
    value === 'promo_percent' ||
    value === 'external' ||
    value === 'nothing'
  ) {
    return value;
  }
  return 'nothing';
}

function normalizeOption(raw, index) {
  const row = asRecord(raw);
  if (!row) return null;
  const label = String(row.label || '').trim();
  if (!label) return null;
  const prizeType = normalizePrizeType(row.prizeType);
  return {
    id: String(row.id || `sw_opt_${index + 1}`).trim(),
    label,
    weight: Math.max(0, Number(row.weight) || 0),
    enabled: row.enabled !== false,
    color: String(row.color || '#7B3DFF'),
    prizeType,
    points: prizeType === 'points' ? Math.max(0, Math.round(Number(row.points) || 0)) : 0,
    discountValue:
      prizeType === 'promo_amount' || prizeType === 'promo_percent'
        ? Math.max(0, Number(row.discountValue) || 0)
        : 0,
    promoValidityDays:
      prizeType === 'promo_amount' || prizeType === 'promo_percent'
        ? Math.max(0, Math.round(Number(row.promoValidityDays) || 0))
        : 0,
    externalDetails: prizeType === 'external' ? String(row.externalDetails || '').trim() : '',
    imageUrl: String(row.imageUrl || '').trim(),
  };
}

async function getSpinWheelSettings(dbRef) {
  const snap = await dbRef.collection('settings').doc('global').get();
  const data = snap.exists ? snap.data() || {} : {};
  const source = asRecord(data.spinWheel);
  if (!source) {
    return {
      ...DEFAULT_SETTINGS,
      options: DEFAULT_OPTIONS.map((o) => ({ ...o })),
    };
  }
  const optionsRaw = Array.isArray(source.options) ? source.options : [];
  const options = optionsRaw.map(normalizeOption).filter(Boolean);
  return {
    enabled: source.enabled !== false,
    title: String(source.title || DEFAULT_SETTINGS.title),
    subtitle: String(source.subtitle || DEFAULT_SETTINGS.subtitle),
    spinButtonLabel: String(source.spinButtonLabel || DEFAULT_SETTINGS.spinButtonLabel),
    costPoints: Math.max(0, Math.round(Number(source.costPoints) || 0)),
    dailyLimit: Math.max(0, Math.round(Number(source.dailyLimit) || 0)),
    resetPeriodHours: Math.max(1, Math.min(168, Math.round(Number(source.resetPeriodHours) || 24))),
    centerImageUrl: String(source.centerImageUrl || '').trim(),
    options: options.length > 0 ? options : DEFAULT_OPTIONS.map((o) => ({ ...o })),
  };
}

function getEnabledOptions(settings) {
  return (settings.options || []).filter((o) => o.enabled && o.weight > 0);
}

function pickWeightedOption(options, random01) {
  const enabled = getEnabledOptions({ options });
  const total = enabled.reduce((sum, o) => sum + o.weight, 0);
  if (total <= 0 || enabled.length === 0) return null;
  const clamped = Math.min(0.999999, Math.max(0, random01));
  let cursor = clamped * total;
  for (const option of enabled) {
    cursor -= option.weight;
    if (cursor < 0) return option;
  }
  return enabled[enabled.length - 1] || null;
}

function baghdadDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

module.exports = {
  getSpinWheelSettings,
  pickWeightedOption,
  getEnabledOptions,
  baghdadDateKey,
  DEFAULT_SETTINGS,
};
