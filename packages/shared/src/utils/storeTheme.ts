import type { CSSProperties } from 'react';
import type { Store } from '../types';

export type StoreThemeGradientStyle = 'linear' | 'radial';

export type StoreThemeGradientDirection =
  | 'to-right'
  | 'to-left'
  | 'to-bottom'
  | 'to-top'
  | 'to-bottom-right'
  | 'to-bottom-left'
  | 'to-top-right'
  | 'to-top-left';

export type StoreThemeRadialPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export type StoreThemeColorFillMode = 'solid' | 'gradient';

export interface StoreThemeColorFill {
  mode?: StoreThemeColorFillMode;
  solid?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: StoreThemeGradientDirection;
}

export interface ResolvedFieldAppearance {
  mode: StoreThemeColorFillMode;
  solid: string;
  gradient: string;
}

export interface StoreThemeSettings {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textOnPrimary: string;
  pageBackground?: string;
  gradientStyle?: StoreThemeGradientStyle;
  gradientDirection?: StoreThemeGradientDirection;
  radialPosition?: StoreThemeRadialPosition;
  headerBackground?: string;
  infoBarBackground?: string;
  infoBarTextColor?: string;
  infoBarBorderColor?: string;
  shopNameColor?: string;
  sectionTitleColor?: string;
  pageTextColor?: string;
  iconColor?: string;
  filterBadgeColor?: string;
  filterChipActiveText?: string;
  buttonTextColor?: string;
  cardPrimaryColor?: string;
  cardSecondaryColor?: string;
  productCardTextColor?: string;
  productPriceColor?: string;
  addToCartIconColor?: string;
  addToCartButtonBg?: string;
  colorFills?: Partial<Record<StoreThemeColorFieldKey, StoreThemeColorFill>>;
}

export const DEFAULT_STORE_THEME: StoreThemeSettings = {
  enabled: false,
  primaryColor: '#7B3DFF',
  secondaryColor: '#0B1320',
  accentColor: '#fff700',
  textOnPrimary: '#FFFFFF',
  pageBackground: '',
  gradientStyle: 'linear',
  gradientDirection: 'to-right',
  radialPosition: 'center',
  headerBackground: '',
  infoBarBackground: '',
  infoBarTextColor: '',
  infoBarBorderColor: '',
  shopNameColor: '',
  sectionTitleColor: '',
  pageTextColor: '',
  iconColor: '',
  filterBadgeColor: '',
  filterChipActiveText: '',
  buttonTextColor: '',
  cardPrimaryColor: '',
  cardSecondaryColor: '',
  productCardTextColor: '',
  productPriceColor: '',
  addToCartIconColor: '',
  addToCartButtonBg: '',
  colorFills: {},
};

export type StoreThemeColorFieldKey = keyof Pick<
  StoreThemeSettings,
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'textOnPrimary'
  | 'pageBackground'
  | 'headerBackground'
  | 'infoBarBackground'
  | 'infoBarTextColor'
  | 'infoBarBorderColor'
  | 'shopNameColor'
  | 'sectionTitleColor'
  | 'pageTextColor'
  | 'iconColor'
  | 'filterBadgeColor'
  | 'filterChipActiveText'
  | 'buttonTextColor'
  | 'cardPrimaryColor'
  | 'cardSecondaryColor'
  | 'productCardTextColor'
  | 'productPriceColor'
  | 'addToCartIconColor'
  | 'addToCartButtonBg'
>;

export const STORE_THEME_COLOR_GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  fields: Array<{
    key: StoreThemeColorFieldKey;
    label: string;
    hint: string;
    optional?: boolean;
  }>;
}> = [
  {
    id: 'core',
    title: 'الألوان الرئيسية',
    description: 'التدرج العام: الغلاف، الأزرار، ولوحة الفلاتر',
    fields: [
      { key: 'primaryColor', label: 'اللون الأساسي', hint: 'بداية التدرج والأزرار' },
      { key: 'secondaryColor', label: 'اللون الثانوي', hint: 'نهاية التدرج وشريط المعلومات' },
      {
        key: 'pageBackground',
        label: 'خلفية الصفحة',
        hint: 'فارغ = الخلفية الافتراضية',
        optional: true,
      },
    ],
  },
  {
    id: 'header',
    title: 'معلومات المتجر',
    description: 'اسم المتجر والنصوص في الشريط العلوي',
    fields: [
      {
        key: 'shopNameColor',
        label: 'اسم المتجر',
        hint: 'فارغ = اللون الأساسي',
        optional: true,
      },
      {
        key: 'infoBarTextColor',
        label: 'المحافظة والهاتف',
        hint: 'فارغ = أبيض',
        optional: true,
      },
      {
        key: 'infoBarBackground',
        label: 'خلفية شريط المعلومات',
        hint: 'فارغ = اللون الثانوي',
        optional: true,
      },
    ],
  },
  {
    id: 'filters',
    title: 'الفلاتر والعناوين',
    description: 'لوحة البحث وعنوان «منتجات المتجر»',
    fields: [
      {
        key: 'sectionTitleColor',
        label: 'عنوان منتجات المتجر',
        hint: 'فارغ = أبيض',
        optional: true,
      },
      {
        key: 'buttonTextColor',
        label: 'نص الفلاتر والأزرار',
        hint: 'فارغ = أبيض',
        optional: true,
      },
      {
        key: 'filterChipActiveText',
        label: 'نص الفلتر النشط',
        hint: 'فارغ = اللون الأساسي',
        optional: true,
      },
    ],
  },
  {
    id: 'products',
    title: 'بطاقات المنتجات',
    description: 'ألوان بطاقات المنتجات كما تظهر للزبون',
    fields: [
      {
        key: 'cardPrimaryColor',
        label: 'بداية تدرج البطاقة',
        hint: 'فارغ = اللون الأساسي',
        optional: true,
      },
      {
        key: 'cardSecondaryColor',
        label: 'نهاية تدرج البطاقة',
        hint: 'فارغ = اللون الثانوي',
        optional: true,
      },
      {
        key: 'productCardTextColor',
        label: 'نص البطاقة',
        hint: 'فارغ = أبيض',
        optional: true,
      },
      {
        key: 'productPriceColor',
        label: 'لون السعر',
        hint: 'فارغ = الأصفر',
        optional: true,
      },
      {
        key: 'addToCartButtonBg',
        label: 'زر الإضافة للسلة',
        hint: 'فارغ = أبيض',
        optional: true,
      },
    ],
  },
];

export const STORE_GRADIENT_STYLE_OPTIONS: Array<{
  id: StoreThemeGradientStyle;
  label: string;
  hint: string;
}> = [
  { id: 'linear', label: 'تدرج خطي', hint: 'انتقال بين لونين باتجاه محدد' },
  { id: 'radial', label: 'تدرج دائري', hint: 'انتشار اللون من نقطة مركزية' },
];

export const STORE_GRADIENT_DIRECTION_OPTIONS: Array<{
  id: StoreThemeGradientDirection;
  label: string;
  shortLabel: string;
}> = [
  { id: 'to-right', label: 'أفقي — لليمين', shortLabel: '→' },
  { id: 'to-left', label: 'أفقي — لليسار', shortLabel: '←' },
  { id: 'to-bottom', label: 'عمودي — لأسفل', shortLabel: '↓' },
  { id: 'to-top', label: 'عمودي — لأعلى', shortLabel: '↑' },
  { id: 'to-bottom-right', label: 'قطري — أسفل يمين', shortLabel: '↘' },
  { id: 'to-bottom-left', label: 'قطري — أسفل يسار', shortLabel: '↙' },
  { id: 'to-top-right', label: 'قطري — أعلى يمين', shortLabel: '↗' },
  { id: 'to-top-left', label: 'قطري — أعلى يسار', shortLabel: '↖' },
];

export const STORE_RADIAL_POSITION_OPTIONS: Array<{
  id: StoreThemeRadialPosition;
  label: string;
}> = [
  { id: 'center', label: 'من المركز' },
  { id: 'top', label: 'من الأعلى' },
  { id: 'bottom', label: 'من الأسفل' },
  { id: 'top-right', label: 'أعلى اليمين' },
  { id: 'top-left', label: 'أعلى اليسار' },
  { id: 'bottom-right', label: 'أسفل اليمين' },
  { id: 'bottom-left', label: 'أسفل اليسار' },
];

const GRADIENT_DIRECTION_CSS: Record<StoreThemeGradientDirection, string> = {
  'to-right': 'to right',
  'to-left': 'to left',
  'to-bottom': 'to bottom',
  'to-top': 'to top',
  'to-bottom-right': 'to bottom right',
  'to-bottom-left': 'to bottom left',
  'to-top-right': 'to top right',
  'to-top-left': 'to top left',
};

const RADIAL_POSITION_CSS: Record<StoreThemeRadialPosition, string> = {
  center: 'circle at center',
  top: 'circle at top',
  bottom: 'circle at bottom',
  'top-right': 'circle at top right',
  'top-left': 'circle at top left',
  'bottom-right': 'circle at bottom right',
  'bottom-left': 'circle at bottom left',
};

function pickColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function mergeStoreTheme(raw?: Store['storeTheme'] | null): StoreThemeSettings {
  return {
    enabled: raw?.enabled ?? DEFAULT_STORE_THEME.enabled,
    primaryColor: raw?.primaryColor || DEFAULT_STORE_THEME.primaryColor,
    secondaryColor: raw?.secondaryColor || DEFAULT_STORE_THEME.secondaryColor,
    accentColor: raw?.accentColor || DEFAULT_STORE_THEME.accentColor,
    textOnPrimary: raw?.textOnPrimary || DEFAULT_STORE_THEME.textOnPrimary,
    pageBackground: raw?.pageBackground ?? DEFAULT_STORE_THEME.pageBackground,
    gradientStyle: raw?.gradientStyle ?? DEFAULT_STORE_THEME.gradientStyle,
    gradientDirection: raw?.gradientDirection ?? DEFAULT_STORE_THEME.gradientDirection,
    radialPosition: raw?.radialPosition ?? DEFAULT_STORE_THEME.radialPosition,
    headerBackground: raw?.headerBackground ?? DEFAULT_STORE_THEME.headerBackground,
    infoBarBackground: raw?.infoBarBackground ?? DEFAULT_STORE_THEME.infoBarBackground,
    infoBarTextColor: raw?.infoBarTextColor ?? DEFAULT_STORE_THEME.infoBarTextColor,
    infoBarBorderColor: raw?.infoBarBorderColor ?? DEFAULT_STORE_THEME.infoBarBorderColor,
    shopNameColor: raw?.shopNameColor ?? DEFAULT_STORE_THEME.shopNameColor,
    sectionTitleColor: raw?.sectionTitleColor ?? DEFAULT_STORE_THEME.sectionTitleColor,
    pageTextColor: raw?.pageTextColor ?? DEFAULT_STORE_THEME.pageTextColor,
    iconColor: raw?.iconColor ?? DEFAULT_STORE_THEME.iconColor,
    filterBadgeColor: raw?.filterBadgeColor ?? DEFAULT_STORE_THEME.filterBadgeColor,
    filterChipActiveText: raw?.filterChipActiveText ?? DEFAULT_STORE_THEME.filterChipActiveText,
    buttonTextColor: raw?.buttonTextColor ?? DEFAULT_STORE_THEME.buttonTextColor,
    cardPrimaryColor: raw?.cardPrimaryColor ?? DEFAULT_STORE_THEME.cardPrimaryColor,
    cardSecondaryColor: raw?.cardSecondaryColor ?? DEFAULT_STORE_THEME.cardSecondaryColor,
    productCardTextColor: raw?.productCardTextColor ?? DEFAULT_STORE_THEME.productCardTextColor,
    productPriceColor: raw?.productPriceColor ?? DEFAULT_STORE_THEME.productPriceColor,
    addToCartIconColor: raw?.addToCartIconColor ?? DEFAULT_STORE_THEME.addToCartIconColor,
    addToCartButtonBg: raw?.addToCartButtonBg ?? DEFAULT_STORE_THEME.addToCartButtonBg,
    colorFills: raw?.colorFills ?? DEFAULT_STORE_THEME.colorFills,
  };
}

export function buildFieldLinearGradient(
  from: string,
  to: string,
  direction: StoreThemeGradientDirection = 'to-right',
): string {
  return `linear-gradient(${GRADIENT_DIRECTION_CSS[direction]}, ${from}, ${to})`;
}

export function getFieldFillMode(
  settings: StoreThemeSettings,
  key: StoreThemeColorFieldKey,
): StoreThemeColorFillMode {
  return settings.colorFills?.[key]?.mode === 'gradient' ? 'gradient' : 'solid';
}

export function resolveFieldAppearance(
  key: StoreThemeColorFieldKey,
  settings: StoreThemeSettings,
  fallbackSolid: string,
  fallbackGradientTo?: string,
): ResolvedFieldAppearance {
  const fill = settings.colorFills?.[key];
  const flatValue = typeof settings[key] === 'string' ? (settings[key] as string).trim() : '';
  const solid = fill?.solid?.trim() || flatValue || fallbackSolid;
  const gradientTo =
    fill?.gradientTo?.trim() ||
    fallbackGradientTo ||
    settings.secondaryColor ||
    DEFAULT_STORE_THEME.secondaryColor;
  const gradientFrom = fill?.gradientFrom?.trim() || solid;
  const direction = fill?.gradientDirection ?? settings.gradientDirection ?? 'to-right';

  if (fill?.mode === 'gradient') {
    return {
      mode: 'gradient',
      solid: gradientFrom,
      gradient: buildFieldLinearGradient(gradientFrom, gradientTo, direction),
    };
  }

  return {
    mode: 'solid',
    solid,
    gradient: solid,
  };
}

function resolveAllFieldAppearances(
  settings: StoreThemeSettings,
  gradient: string,
): Record<StoreThemeColorFieldKey, ResolvedFieldAppearance> {
  const primary = settings.primaryColor || DEFAULT_STORE_THEME.primaryColor;
  const secondary = settings.secondaryColor || DEFAULT_STORE_THEME.secondaryColor;

  return {
    primaryColor: resolveFieldAppearance('primaryColor', settings, primary, secondary),
    secondaryColor: resolveFieldAppearance('secondaryColor', settings, secondary, primary),
    accentColor: resolveFieldAppearance('accentColor', settings, settings.accentColor || DEFAULT_STORE_THEME.accentColor, primary),
    textOnPrimary: resolveFieldAppearance('textOnPrimary', settings, settings.textOnPrimary || DEFAULT_STORE_THEME.textOnPrimary, primary),
    pageBackground: resolveFieldAppearance('pageBackground', settings, primary, secondary),
    headerBackground: resolveFieldAppearance('headerBackground', settings, primary, secondary),
    infoBarBackground: resolveFieldAppearance('infoBarBackground', settings, secondary, primary),
    infoBarTextColor: resolveFieldAppearance('infoBarTextColor', settings, '#FFFFFF', primary),
    infoBarBorderColor: resolveFieldAppearance('infoBarBorderColor', settings, primary, secondary),
    shopNameColor: resolveFieldAppearance('shopNameColor', settings, primary, secondary),
    sectionTitleColor: resolveFieldAppearance('sectionTitleColor', settings, '#FFFFFF', primary),
    pageTextColor: resolveFieldAppearance('pageTextColor', settings, '#FFFFFF', primary),
    iconColor: resolveFieldAppearance('iconColor', settings, primary, secondary),
    filterBadgeColor: resolveFieldAppearance('filterBadgeColor', settings, settings.accentColor || DEFAULT_STORE_THEME.accentColor, primary),
    filterChipActiveText: resolveFieldAppearance('filterChipActiveText', settings, primary, secondary),
    buttonTextColor: resolveFieldAppearance('buttonTextColor', settings, settings.textOnPrimary || DEFAULT_STORE_THEME.textOnPrimary, primary),
    cardPrimaryColor: resolveFieldAppearance(
      'cardPrimaryColor',
      settings,
      pickColor(settings.cardPrimaryColor, primary),
      pickColor(settings.cardSecondaryColor, secondary),
    ),
    cardSecondaryColor: resolveFieldAppearance(
      'cardSecondaryColor',
      settings,
      pickColor(settings.cardSecondaryColor, secondary),
      pickColor(settings.cardPrimaryColor, primary),
    ),
    productCardTextColor: resolveFieldAppearance(
      'productCardTextColor',
      settings,
      pickColor(settings.productCardTextColor, settings.textOnPrimary || DEFAULT_STORE_THEME.textOnPrimary),
      primary,
    ),
    productPriceColor: resolveFieldAppearance(
      'productPriceColor',
      settings,
      pickColor(settings.productPriceColor, settings.accentColor || DEFAULT_STORE_THEME.accentColor),
      primary,
    ),
    addToCartIconColor: resolveFieldAppearance('addToCartIconColor', settings, primary, secondary),
    addToCartButtonBg: resolveFieldAppearance('addToCartButtonBg', settings, '#FFFFFF', primary),
  };
}

export function themeFieldBackgroundStyle(app: ResolvedFieldAppearance): CSSProperties {
  if (app.mode === 'gradient') {
    return { background: app.gradient };
  }
  return { backgroundColor: app.solid };
}

export function themeFieldTextStyle(app: ResolvedFieldAppearance): CSSProperties {
  if (app.mode === 'gradient') {
    return {
      backgroundImage: app.gradient,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    };
  }
  return { color: app.solid };
}

export function themeFieldBorderColor(app: ResolvedFieldAppearance): string {
  return app.solid;
}

export function themeFieldIconColor(app: ResolvedFieldAppearance): string {
  return app.solid;
}

export function buildStoreGradient(
  settings: Pick<
    StoreThemeSettings,
    'primaryColor' | 'secondaryColor' | 'gradientStyle' | 'gradientDirection' | 'radialPosition'
  >,
): string {
  const primaryColor = settings.primaryColor || DEFAULT_STORE_THEME.primaryColor;
  const secondaryColor = settings.secondaryColor || DEFAULT_STORE_THEME.secondaryColor;
  const gradientStyle = settings.gradientStyle ?? DEFAULT_STORE_THEME.gradientStyle!;
  const gradientDirection = settings.gradientDirection ?? DEFAULT_STORE_THEME.gradientDirection!;
  const radialPosition = settings.radialPosition ?? DEFAULT_STORE_THEME.radialPosition!;

  if (gradientStyle === 'radial') {
    return `radial-gradient(${RADIAL_POSITION_CSS[radialPosition]}, ${primaryColor}, ${secondaryColor})`;
  }

  return `linear-gradient(${GRADIENT_DIRECTION_CSS[gradientDirection]}, ${primaryColor}, ${secondaryColor})`;
}

export interface ResolvedStoreTheme extends Required<
  Pick<StoreThemeSettings, 'gradientStyle' | 'gradientDirection' | 'radialPosition'>
> {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textOnPrimary: string;
  pageBackground?: string;
  headerBackground: string;
  infoBarBackground: string;
  infoBarTextColor: string;
  infoBarBorderColor: string;
  shopNameColor: string;
  sectionTitleColor: string;
  pageTextColor: string;
  iconColor: string;
  filterBadgeColor: string;
  filterChipActiveText: string;
  buttonTextColor: string;
  cardPrimaryColor: string;
  cardSecondaryColor: string;
  productCardTextColor: string;
  productPriceColor: string;
  addToCartIconColor: string;
  addToCartButtonBg: string;
  gradient: string;
  cardGradient: string;
  gradientToLeft: string;
  fields: Record<StoreThemeColorFieldKey, ResolvedFieldAppearance>;
}

function hasCustomFieldValue(settings: StoreThemeSettings, key: StoreThemeColorFieldKey): boolean {
  return (
    Boolean(typeof settings[key] === 'string' && (settings[key] as string).trim()) ||
    Boolean(settings.colorFills?.[key])
  );
}

function resolveBackgroundCss(
  field: ResolvedFieldAppearance,
  settings: StoreThemeSettings,
  key: StoreThemeColorFieldKey,
  defaultCss: string,
): string {
  if (!hasCustomFieldValue(settings, key)) {
    return defaultCss;
  }
  return field.mode === 'gradient' ? field.gradient : field.solid;
}

export function resolveStoreTheme(store?: Pick<Store, 'storeTheme'> | null): ResolvedStoreTheme {
  const settings = mergeStoreTheme(store?.storeTheme);
  const gradient = buildStoreGradient(settings);
  const fields = resolveAllFieldAppearances(settings, gradient);

  const cardGradient =
    fields.cardPrimaryColor.mode === 'gradient'
      ? fields.cardPrimaryColor.gradient
      : fields.cardSecondaryColor.mode === 'gradient'
        ? fields.cardSecondaryColor.gradient
        : buildStoreGradient({
            primaryColor: fields.cardPrimaryColor.solid,
            secondaryColor: fields.cardSecondaryColor.solid,
            gradientStyle: settings.gradientStyle,
            gradientDirection: settings.gradientDirection,
            radialPosition: settings.radialPosition,
          });

  const headerBackground = resolveBackgroundCss(fields.headerBackground, settings, 'headerBackground', gradient);
  const infoBarBackground = resolveBackgroundCss(
    fields.infoBarBackground,
    settings,
    'infoBarBackground',
    fields.infoBarBackground.solid,
  );
  const pageBackgroundRaw = resolveBackgroundCss(fields.pageBackground, settings, 'pageBackground', '');

  return {
    enabled: settings.enabled,
    primaryColor: fields.primaryColor.solid,
    secondaryColor: fields.secondaryColor.solid,
    accentColor: fields.accentColor.solid,
    textOnPrimary: fields.textOnPrimary.solid,
    pageBackground: pageBackgroundRaw || settings.pageBackground,
    gradientStyle: settings.gradientStyle ?? DEFAULT_STORE_THEME.gradientStyle!,
    gradientDirection: settings.gradientDirection ?? DEFAULT_STORE_THEME.gradientDirection!,
    radialPosition: settings.radialPosition ?? DEFAULT_STORE_THEME.radialPosition!,
    headerBackground,
    infoBarBackground,
    infoBarTextColor: fields.infoBarTextColor.solid,
    infoBarBorderColor: fields.infoBarBorderColor.solid,
    shopNameColor: fields.shopNameColor.solid,
    sectionTitleColor: fields.sectionTitleColor.solid,
    pageTextColor: fields.pageTextColor.solid,
    iconColor: fields.iconColor.solid,
    filterBadgeColor: fields.filterBadgeColor.solid,
    filterChipActiveText: fields.filterChipActiveText.solid,
    buttonTextColor: fields.buttonTextColor.solid,
    cardPrimaryColor: fields.cardPrimaryColor.solid,
    cardSecondaryColor: fields.cardSecondaryColor.solid,
    productCardTextColor: fields.productCardTextColor.solid,
    productPriceColor: fields.productPriceColor.solid,
    addToCartIconColor: fields.addToCartIconColor.solid,
    addToCartButtonBg: fields.addToCartButtonBg.solid,
    gradient,
    cardGradient,
    gradientToLeft: settings.enabled
      ? gradient
      : `linear-gradient(to left, ${settings.primaryColor}, ${settings.secondaryColor})`,
    fields,
  };
}

export function storeThemeCssVars(theme: ResolvedStoreTheme): CSSProperties {
  return {
    '--store-primary': theme.primaryColor,
    '--store-secondary': theme.secondaryColor,
    '--store-accent': theme.accentColor,
    '--store-text-on-primary': theme.textOnPrimary,
    '--store-gradient': theme.gradient,
    '--store-card-gradient': theme.cardGradient,
    '--store-gradient-left': theme.gradientToLeft,
  } as CSSProperties;
}

export function storeGradientProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled) {
    const panel = theme.fields.primaryColor.mode === 'gradient'
      ? theme.fields.primaryColor.gradient
      : theme.fields.secondaryColor.mode === 'gradient'
        ? theme.fields.secondaryColor.gradient
        : theme.gradient;
    return { className: '', style: { background: panel } };
  }
  return { className: 'bg-gradient-to-r from-[#7B3DFF] to-[#0B1320]' };
}

export function storeProductCardGradientProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled) {
    return { className: '', style: { background: theme.cardGradient } };
  }
  return { className: 'bg-gradient-to-r from-[#7B3DFF] to-[#0B1320]' };
}

export function storeHeaderProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled) {
    const isGradient = theme.headerBackground.includes('gradient');
    return {
      className: '',
      style: isGradient ? { background: theme.headerBackground } : { backgroundColor: theme.headerBackground },
    };
  }
  return { className: 'bg-gradient-to-l from-vibrant-purple to-deep-navy' };
}

export function storeGradientToLeftProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  return storeHeaderProps(theme);
}

export function storePrimaryBgProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled) {
    return { className: '', style: themeFieldBackgroundStyle(theme.fields.primaryColor) };
  }
  return { className: 'bg-vibrant-purple' };
}

export function storeInfoBarProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled) {
    const isGradient = theme.infoBarBackground.includes('gradient');
    return {
      className: 'border',
      style: {
        ...(isGradient ? { background: theme.infoBarBackground } : { backgroundColor: theme.infoBarBackground }),
        borderColor: themeFieldBorderColor(theme.fields.infoBarBorderColor),
      },
    };
  }
  return { className: 'bg-deep-navy border border-vibrant-purple' };
}

export function storePageBackgroundProps(theme: ResolvedStoreTheme): {
  className: string;
  style?: CSSProperties;
} {
  if (theme.enabled && theme.pageBackground) {
    const isGradient =
      theme.fields.pageBackground.mode === 'gradient' || theme.pageBackground.includes('gradient');
    return {
      className: '',
      style: isGradient
        ? { background: theme.pageBackground }
        : { backgroundColor: theme.pageBackground },
    };
  }
  return { className: 'bg-mahalak-gradient' };
}

/** Strip undefined values so Firestore accepts nested storeTheme maps. */
export function sanitizeStoreThemeForFirestore(theme: StoreThemeSettings): StoreThemeSettings {
  const cleaned = JSON.parse(JSON.stringify(theme)) as StoreThemeSettings;
  cleaned.enabled = Boolean(cleaned.enabled);
  cleaned.colorFills = cleaned.colorFills ?? {};
  return cleaned;
}

export function getStoreGradientPreviewStyle(settings: StoreThemeSettings): CSSProperties {
  return { background: buildStoreGradient(settings) };
}

export function getDefaultColorForField(
  key: StoreThemeColorFieldKey,
  draft: StoreThemeSettings,
): string {
  const base = { ...DEFAULT_STORE_THEME, ...draft };
  switch (key) {
    case 'primaryColor':
      return base.primaryColor;
    case 'secondaryColor':
      return base.secondaryColor;
    case 'accentColor':
      return base.accentColor;
    case 'textOnPrimary':
      return base.textOnPrimary;
    case 'pageBackground':
      return base.primaryColor;
    case 'headerBackground':
      return base.primaryColor;
    case 'infoBarBackground':
      return base.secondaryColor;
    case 'infoBarTextColor':
      return '#FFFFFF';
    case 'infoBarBorderColor':
      return base.primaryColor;
    case 'shopNameColor':
      return base.primaryColor;
    case 'sectionTitleColor':
    case 'pageTextColor':
      return '#FFFFFF';
    case 'iconColor':
    case 'filterChipActiveText':
    case 'cardPrimaryColor':
    case 'addToCartIconColor':
      return base.primaryColor;
    case 'filterBadgeColor':
    case 'productPriceColor':
      return base.accentColor;
    case 'buttonTextColor':
    case 'productCardTextColor':
      return base.textOnPrimary;
    case 'cardSecondaryColor':
      return base.secondaryColor;
    case 'addToCartButtonBg':
      return '#FFFFFF';
    default:
      return base.primaryColor;
  }
}

export function getDefaultGradientToForField(
  key: StoreThemeColorFieldKey,
  draft: StoreThemeSettings,
): string {
  if (key === 'secondaryColor' || key === 'cardSecondaryColor' || key === 'infoBarBackground') {
    return getDefaultColorForField('primaryColor', draft);
  }
  return getDefaultColorForField('secondaryColor', draft);
}
