export type SpinWheelPrizeType =
  | 'points'
  | 'promo_amount'
  | 'promo_percent'
  | 'external'
  | 'nothing';

export interface SpinWheelOption {
  id: string;
  label: string;
  /** Relative probability weight (higher = more chance). Normalized server-side. */
  weight: number;
  enabled: boolean;
  color: string;
  prizeType: SpinWheelPrizeType;
  /** Optional image shown on the wheel slice (HTTPS or Storage URL). */
  imageUrl?: string;
  /** Points awarded when prizeType === 'points' */
  points?: number;
  /** Discount value for promo_amount (IQD) or promo_percent (%) */
  discountValue?: number;
  /** Days until promo expires (promo types only). 0 = no expiry field. */
  promoValidityDays?: number;
  /** Description / claim instructions when prizeType === 'external' */
  externalDetails?: string;
}

export interface SpinWheelSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  spinButtonLabel: string;
  /** Points deducted per spin (0 = free). */
  costPoints: number;
  /** Max spins per reset period (0 = unlimited). */
  dailyLimit: number;
  /**
   * Hours until spin attempts reset after the period starts (first spin in the window).
   * Default 24. Shown as a countdown when the customer hits the limit.
   */
  resetPeriodHours: number;
  /** Optional hub image in the wheel center (HTTPS or Storage URL). */
  centerImageUrl?: string;
  options: SpinWheelOption[];
}

const SLICE_COLORS = [
  '#7B3DFF',
  '#0B1320',
  '#EAB308',
  '#0EA5E9',
  '#F43F5E',
  '#10B981',
  '#F97316',
  '#6366F1',
];

export const DEFAULT_SPIN_WHEEL_OPTIONS: SpinWheelOption[] = [
  {
    id: 'sw_pts_50',
    label: '50 نقطة',
    weight: 28,
    enabled: true,
    color: SLICE_COLORS[0],
    prizeType: 'points',
    points: 50,
  },
  {
    id: 'sw_pts_100',
    label: '100 نقطة',
    weight: 18,
    enabled: true,
    color: SLICE_COLORS[1],
    prizeType: 'points',
    points: 100,
  },
  {
    id: 'sw_pts_200',
    label: '200 نقطة',
    weight: 10,
    enabled: true,
    color: SLICE_COLORS[2],
    prizeType: 'points',
    points: 200,
  },
  {
    id: 'sw_promo_5k',
    label: 'خصم 5,000 د.ع',
    weight: 8,
    enabled: true,
    color: SLICE_COLORS[3],
    prizeType: 'promo_amount',
    discountValue: 5000,
    promoValidityDays: 14,
  },
  {
    id: 'sw_promo_10pct',
    label: 'خصم 10%',
    weight: 6,
    enabled: true,
    color: SLICE_COLORS[4],
    prizeType: 'promo_percent',
    discountValue: 10,
    promoValidityDays: 14,
  },
  {
    id: 'sw_nothing',
    label: 'حظ أوفر',
    weight: 30,
    enabled: true,
    color: SLICE_COLORS[5],
    prizeType: 'nothing',
  },
];

export const DEFAULT_SPIN_WHEEL_SETTINGS: SpinWheelSettings = {
  enabled: true,
  title: 'عجلة الحظ',
  subtitle: 'أدِر العجلة واربح نقاطاً أو أكواد خصم فورية',
  spinButtonLabel: 'تدوير العجلة',
  costPoints: 0,
  dailyLimit: 3,
  resetPeriodHours: 24,
  options: DEFAULT_SPIN_WHEEL_OPTIONS,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizePrizeType(value: unknown): SpinWheelPrizeType {
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

function normalizeOption(raw: unknown, index: number): SpinWheelOption | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = String(row.id || `sw_opt_${index + 1}`).trim();
  const label = String(row.label || '').trim();
  if (!label) return null;
  const weight = Math.max(0, Number(row.weight) || 0);
  const prizeType = normalizePrizeType(row.prizeType);
  // Omit unused prize fields — Firestore rejects `undefined` on writes.
  const option: SpinWheelOption = {
    id,
    label,
    weight,
    enabled: row.enabled !== false,
    color: String(row.color || SLICE_COLORS[index % SLICE_COLORS.length]),
    prizeType,
  };
  if (prizeType === 'points') {
    option.points = Math.max(0, Math.round(Number(row.points) || 0));
  }
  if (prizeType === 'promo_amount' || prizeType === 'promo_percent') {
    option.discountValue = Math.max(0, Number(row.discountValue) || 0);
    option.promoValidityDays = Math.max(0, Math.round(Number(row.promoValidityDays) || 0));
  }
  if (prizeType === 'external') {
    const details = String(row.externalDetails || '').trim();
    if (details) option.externalDetails = details;
  }
  const imageUrl = String(row.imageUrl || '').trim();
  if (imageUrl) option.imageUrl = imageUrl;
  return option;
}

export function resolveSpinWheelSettings(
  adminSettings: Record<string, unknown> | null | undefined,
): SpinWheelSettings {
  const raw = asRecord(adminSettings?.spinWheel) ?? asRecord(adminSettings);
  if (!raw || (!adminSettings?.spinWheel && !raw.options)) {
    return {
      ...DEFAULT_SPIN_WHEEL_SETTINGS,
      options: DEFAULT_SPIN_WHEEL_OPTIONS.map((o) => ({ ...o })),
    };
  }

  const source = asRecord(adminSettings?.spinWheel) ?? raw;
  const optionsRaw = Array.isArray(source.options) ? source.options : [];
  const options = optionsRaw
    .map((item, index) => normalizeOption(item, index))
    .filter((item): item is SpinWheelOption => Boolean(item));

  return {
    enabled: source.enabled !== false,
    title: String(source.title || DEFAULT_SPIN_WHEEL_SETTINGS.title).trim() || DEFAULT_SPIN_WHEEL_SETTINGS.title,
    subtitle:
      String(source.subtitle || DEFAULT_SPIN_WHEEL_SETTINGS.subtitle).trim() ||
      DEFAULT_SPIN_WHEEL_SETTINGS.subtitle,
    spinButtonLabel:
      String(source.spinButtonLabel || DEFAULT_SPIN_WHEEL_SETTINGS.spinButtonLabel).trim() ||
      DEFAULT_SPIN_WHEEL_SETTINGS.spinButtonLabel,
    costPoints: Math.max(0, Math.round(Number(source.costPoints) || 0)),
    dailyLimit: Math.max(0, Math.round(Number(source.dailyLimit) || 0)),
    resetPeriodHours: Math.max(
      1,
      Math.min(168, Math.round(Number(source.resetPeriodHours) || DEFAULT_SPIN_WHEEL_SETTINGS.resetPeriodHours)),
    ),
    ...(String(source.centerImageUrl || '').trim()
      ? { centerImageUrl: String(source.centerImageUrl).trim() }
      : {}),
    options: options.length > 0 ? options : DEFAULT_SPIN_WHEEL_OPTIONS.map((o) => ({ ...o })),
  };
}

export function getEnabledSpinWheelOptions(settings: SpinWheelSettings): SpinWheelOption[] {
  return settings.options.filter((opt) => opt.enabled && opt.weight > 0);
}

export function getSpinWheelTotalWeight(options: SpinWheelOption[]): number {
  return options.reduce((sum, opt) => sum + Math.max(0, opt.weight), 0);
}

/** Chance percent for display (0–100). */
export function getSpinWheelChancePercent(option: SpinWheelOption, options: SpinWheelOption[]): number {
  const enabled = options.filter((o) => o.enabled && o.weight > 0);
  const total = getSpinWheelTotalWeight(enabled);
  if (total <= 0 || !option.enabled || option.weight <= 0) return 0;
  return Math.round((option.weight / total) * 1000) / 10;
}

/**
 * Weighted random pick. Prefer crypto on server; Math.random is fine for UI preview only.
 */
export function pickSpinWheelOption(
  options: SpinWheelOption[],
  random01: number = Math.random(),
): SpinWheelOption | null {
  const enabled = getEnabledSpinWheelOptions(options);
  const total = getSpinWheelTotalWeight(enabled);
  if (total <= 0 || enabled.length === 0) return null;
  const clamped = Math.min(0.999999, Math.max(0, random01));
  let cursor = clamped * total;
  for (const option of enabled) {
    cursor -= option.weight;
    if (cursor < 0) return option;
  }
  return enabled[enabled.length - 1] ?? null;
}

export function createEmptySpinWheelOption(index = 0): SpinWheelOption {
  return {
    id: `sw_custom_${Date.now()}_${index}`,
    label: 'خيار جديد',
    weight: 0,
    enabled: true,
    color: SLICE_COLORS[index % SLICE_COLORS.length],
    prizeType: 'points',
    points: 50,
  };
}

/** Firestore-safe option: drop undefined/null keys. */
function serializeSpinWheelOption(opt: SpinWheelOption, index: number): SpinWheelOption {
  const base: SpinWheelOption = {
    id: opt.id || `sw_opt_${index + 1}`,
    label: String(opt.label || '').trim() || `خيار ${index + 1}`,
    weight: Math.max(0, Math.round(Number(opt.weight) * 10) / 10),
    enabled: opt.enabled !== false,
    color: String(opt.color || SLICE_COLORS[index % SLICE_COLORS.length]),
    prizeType: normalizePrizeType(opt.prizeType),
  };
  if (base.prizeType === 'points') {
    base.points = Math.max(0, Math.round(Number(opt.points) || 0));
  }
  if (base.prizeType === 'promo_amount' || base.prizeType === 'promo_percent') {
    base.discountValue = Math.max(0, Number(opt.discountValue) || 0);
    base.promoValidityDays = Math.max(0, Math.round(Number(opt.promoValidityDays) || 0));
  }
  if (base.prizeType === 'external') {
    const details = String(opt.externalDetails || '').trim();
    if (details) base.externalDetails = details;
  }
  const imageUrl = String(opt.imageUrl || '').trim();
  if (imageUrl) base.imageUrl = imageUrl;
  return base;
}

export function buildSpinWheelPayload(settings: SpinWheelSettings): SpinWheelSettings {
  const resolved = resolveSpinWheelSettings({ spinWheel: settings });
  const payload: SpinWheelSettings = {
    enabled: resolved.enabled,
    title: resolved.title,
    subtitle: resolved.subtitle,
    spinButtonLabel: resolved.spinButtonLabel,
    costPoints: resolved.costPoints,
    dailyLimit: resolved.dailyLimit,
    resetPeriodHours: resolved.resetPeriodHours,
    options: resolved.options.map((opt, index) => serializeSpinWheelOption(opt, index)),
  };
  const centerImageUrl = String(settings.centerImageUrl || resolved.centerImageUrl || '').trim();
  if (centerImageUrl) payload.centerImageUrl = centerImageUrl;
  return payload;
}

export function baghdadDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getSpinWheelResetPeriodMs(settings: Pick<SpinWheelSettings, 'resetPeriodHours'>): number {
  const hours = Math.max(1, Math.min(168, Number(settings.resetPeriodHours) || 24));
  return hours * 60 * 60 * 1000;
}

function coerceTimestampMs(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) return asNum;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') {
      const ms = v.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return 0;
}

export type SpinWheelPeriodState = {
  used: number;
  remaining: number | null;
  periodStartedAt: number;
  periodEndsAt: number;
  exhausted: boolean;
  resetPeriodHours: number;
};

/** Client-side view of spin attempts for the current reset window. */
export function resolveSpinWheelPeriodState(
  customer: Record<string, unknown> | null | undefined,
  settings: SpinWheelSettings,
  nowMs: number = Date.now(),
): SpinWheelPeriodState {
  const resetPeriodHours = settings.resetPeriodHours;
  const periodMs = getSpinWheelResetPeriodMs(settings);
  const limit = Math.max(0, settings.dailyLimit);
  let periodStartedAt = coerceTimestampMs(customer?.spinWheelPeriodStartedAt);
  if (!periodStartedAt) {
    periodStartedAt = coerceTimestampMs(customer?.spinWheelLastSpinAt);
  }
  const periodActive = periodStartedAt > 0 && nowMs - periodStartedAt < periodMs;
  const used = periodActive ? Math.max(0, Number(customer?.spinWheelDailyCount || 0)) : 0;
  const started = periodActive ? periodStartedAt : 0;
  const periodEndsAt = started > 0 ? started + periodMs : nowMs + periodMs;
  const remaining = limit > 0 ? Math.max(0, limit - used) : null;
  return {
    used,
    remaining,
    periodStartedAt: started,
    periodEndsAt,
    exhausted: limit > 0 && remaining === 0 && started > 0,
    resetPeriodHours,
  };
}

export function formatCountdownHms(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
