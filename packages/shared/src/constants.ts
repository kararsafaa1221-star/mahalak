import { Province, SubscriptionPlan } from '@shared/types';
import { tKey } from '@shared/i18n/tKey';

export const IRAQ_PROVINCES: Province[] = [{id:'1',name:'بغداد'},{id:'2',name:'البصرة'},{id:'3',name:'نينوى'},{id:'4',name:'أربيل'},{id:'5',name:'السليمانية'},{id:'6',name:'دهوك'},{id:'7',name:'كركوك'},{id:'8',name:'ديالى'},{id:'9',name:'الأنبار'},{id:'10',name:'واسط'},{id:'11',name:'بابل'},{id:'12',name:'كربلاء'},{id:'13',name:'النجف'},{id:'14',name:'ميسان'},{id:'15',name:'ذي قار'},{id:'16',name:'المثنى'},{id:'17',name:'القادسية'},{id:'18',name:'صلاح الدين'}];

/** Display label for a province; stored value stays Arabic `name` for DB matching. */
export function getProvinceLabel(provinceOrName: Province | string | undefined | null): string {
  if (!provinceOrName) return '';
  const province =
    typeof provinceOrName === 'string'
      ? IRAQ_PROVINCES.find((p) => p.name === provinceOrName || p.id === provinceOrName)
      : provinceOrName;
  if (!province) {
    return typeof provinceOrName === 'string' ? provinceOrName : '';
  }
  return tKey(`provinces.${province.id}`, province.name);
}

import { DEFAULT_MERCHANT_RENEWAL_PLANS } from '@shared/constants/merchantRenewalPlans';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = DEFAULT_MERCHANT_RENEWAL_PLANS.map((p) => ({
  id: p.id,
  name: p.labelAr,
  durationMonths: Math.max(1, Math.round(p.durationDays / 30)),
  price: p.priceIqd,
  discountText: p.badge ?? '',
}));

export const STORE_BADGES = [
  { id: 'fast_delivery', label: 'توصيل صاروخي 🚀', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'trusted', label: 'تاجر موثوق ✅', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'best_price', label: 'أفضل سعر 💰', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'top_rated', label: 'الأعلى تقييم 🌟', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'premium', label: 'مميز 👑', color: 'bg-amber-100 text-amber-700 border-amber-200' }
];

export function getStoreBadgeLabel(badgeId: string, fallbackLabel?: string): string {
  const badge = STORE_BADGES.find((b) => b.id === badgeId);
  const fallback = fallbackLabel || badge?.label || badgeId;
  return tKey(`badges.${badgeId}`, fallback);
}

export const STORE_CATEGORIES = [
  { 
    id: 'supermarket', 
    name: 'مجمعات غذائية وسوبرماركت', 
    sub: ['مقبلات وأجبان', 'معلبات', 'مياه وعصائر', 'منظفات منزلية', 'زيوت ورز', 'منتجات ألبان'] 
  },
  { 
    id: 'meats', 
    name: 'لحوم ومجمدات ومواد استهلاكية', 
    sub: ['لحوم حمراء', 'دجاج', 'أسماك', 'همبرغر وكبة جاهزة', 'خضروات مجمدة'] 
  },
  { 
    id: 'sweets', 
    name: 'حلويات ومطاحن وكرزات', 
    sub: ['كرزات ومكسرات', 'بهارات وتوابل', 'قهوة حب', 'حلويات معجنات', 'كليجة ومطيبات'] 
  },
  { 
    id: 'clothing', 
    name: 'ملابس وأزياء', 
    sub: ['ملابس رجالية', 'ملابس نسائية', 'ملابس الأطفال', 'ملابس رياضية', 'تراكسودات'] 
  },
  { 
    id: 'shoes_bags', 
    name: 'أحذية وحقائب', 
    sub: ['أحذية رجالية', 'أحذية نسائية', 'أحذية أطفال', 'حقائب سفر', 'حقائب نسائية', 'إكسسوارات'] 
  },
  { 
    id: 'cosmetics', 
    name: 'كوزمتك ومستحضرات تجميل وعناية', 
    sub: ['مكياج ومستحضرات', 'عطور وبخور', 'العناية بالشعر', 'العناية بالبشرة', 'عدسات وإكسسوارات'] 
  },
  { 
    id: 'watches_jewelry', 
    name: 'ساعات ومجوهرات وإكسسوارات', 
    sub: ['ساعات رجالية', 'ساعات نسائية', 'صياغة ومجوهرات', 'قلائد وأساور', 'نظارات شمسية'] 
  },
  { 
    id: 'mobiles', 
    name: 'موبايلات وأجهزة ذكية وإكسسواراتها', 
    sub: ['موبايلات', 'أجهزة تابلت وآيباد', 'سماعات وايرليس', 'شواحن وكابلات', 'كفرات وحمايات', 'ساعات ذكية'] 
  },
  { 
    id: 'computers', 
    name: 'حاسبات وشبكات وأنظمة برمجية', 
    sub: ['لاب توب', 'حاسبات', 'راوترات وشبكات', 'طابعات وأحبار', 'ملحقات كمبيوتر (ماوس/كيبورد)'] 
  },
  { 
    id: 'appliances', 
    name: 'أجهزة كهربائية ومنزلية ثقيلة', 
    sub: ['سَبالِت ومكيفات', 'شاشات وتلفزيونات', 'ثلاجات ومجمدات', 'طباخات وفرن', 'غسالات ومجففات'] 
  },
  { 
    id: 'power', 
    name: 'منظومات طاقة ومولدات وإنارة', 
    sub: ['عاكسات وبطاريات', 'ألواح طاقة شمسية', 'مولدات منزلية', 'إنارة ولدات (LED)', 'ثريات وديكور ضوئي'] 
  },
  { 
    id: 'furniture', 
    name: 'أثاث ومطابخ وديكور منزلي', 
    sub: ['غرف نوم', 'تخم قنفات وديوان', 'مطابخ جاهزة', 'سجاد وموكيت', 'ستائر ومفروشات'] 
  },
  { 
    id: 'building_materials', 
    name: 'مواد إنشائية وصحية وسيراميك', 
    sub: ['سيراميك وبورسلين', 'خلاطات ومواد صحية', 'أصباغ وديكور', 'حديد ومواد تسليح', 'أنابيب وتجهيزات مياه'] 
  },
  { 
    id: 'car_parts', 
    name: 'أدوات احتياطية وزينة سيارات', 
    sub: ['زينة وإكسسوارات سيارات', 'زيوت وفلاتر', 'إطارات وبطاريات', 'أدوات احتياطية (ميكانيك)', 'منظفات ومواد تلميع'] 
  },
  { 
    id: 'motorcycles', 
    name: 'دراجات نارية وأدواتها الاحتياطية', 
    sub: ['دراجات نارية', 'تكاتك وستوتات', 'أدوات احتياطية للدراجات', 'خوذ وإكسسوارات سلامة'] 
  },
  { 
    id: 'stationary', 
    name: 'مطابع وقرطاسية وألعاب أطفال', 
    sub: ['ألعاب أطفال', 'قرطاسية ومستلزمات مدرسية', 'دفاتر وسجلات', 'هدايا وتوزيعات', 'طباعة كروت وبوسترات'] 
  },
  { 
    id: 'flowers', 
    name: 'زهور وهدايا وتجهيز حفلات', 
    sub: ['زهور طبيعية', 'زهور اصطناعية', 'صناديق هدايا', 'بالونات وتجهيز أعياد ميلاد', 'إكسسوارات مناسبات'] 
  },
  { 
    id: 'sports', 
    name: 'تجهيزات ومستلزمات رياضية', 
    sub: ['ملابس رياضية', 'ملابس قاعات رياضية', 'مكملات غذائية', 'أدوات رشاقة', 'كرات ومستلزمات كرة قدم', 'معدات رياضية'] 
  },
  {
    id: 'pharmacy',
    name: 'صيدليات وعناية صحية',
    sub: ['أدوية وفيتامينات', 'مستلزمات طبية', 'عناية بالبشرة الطبية', 'رعاية الطفل']
  },
  {
    id: 'office_equipment',
    name: 'الأجهزة والمستلزمات المكتبية',
    sub: ['طابعات وماسحات ضوئية', 'كراسي ومكاتب', 'أجهزة عرض', 'مستلزمات قرطاسية مكتبية']
  },
  {
    id: 'home_appliances',
    name: 'الأدوات المنزلية والمطبخ',
    sub: ['أدوات طبخ وتقديم', 'بلاستيكيات ومنظفات', 'عدد وأدوات يدوية', 'ديكورات ومفروشات خفيفة']
  },
  {
    id: 'smoking_hookah',
    name: 'السكائر والأراكيل ولوازمها',
    sub: ['أراكيل ومعسل', 'سكائر إلكترونية وفيب', 'ملحقات الأراكيل', 'فحم وولاعات']
  }
];

/** معرّفات تصنيف قديمة → التصنيف الرسمي في STORE_CATEGORIES */
export const STORE_CATEGORY_ALIASES: Record<string, string> = {
  fashion: 'clothing',
};

export function normalizeStoreCategoryId(categoryId?: string | null): string | undefined {
  if (!categoryId) return undefined;
  return STORE_CATEGORY_ALIASES[categoryId] ?? categoryId;
}

export function storeCategoriesMatch(
  storeCategoryId?: string | null,
  filterCategoryId?: string | null,
): boolean {
  if (!filterCategoryId) return true;
  return normalizeStoreCategoryId(storeCategoryId) === normalizeStoreCategoryId(filterCategoryId);
}

export const STORE_CATEGORY_SHORT_NAMES: Record<string, string> = {
  supermarket: 'سوبرماركت',
  meats: 'لحوم ومجمدات',
  sweets: 'حلويات ومكسرات',
  clothing: 'ملابس وأزياء',
  shoes_bags: 'أحذية وحقائب',
  cosmetics: 'كوزمتك وتجميل',
  watches_jewelry: 'ساعات وهدايا',
  mobiles: 'موبايلات وأجهزة',
  computers: 'حاسبات وشبكات',
  appliances: 'أجهزة منزلية',
  power: 'طاقة وإنارة',
  furniture: 'أثاث وديكور',
  building_materials: 'مواد إنشائية',
  car_parts: 'أدوات سيارات',
  motorcycles: 'دراجات نارية',
  stationary: 'قرطاسية وألعاب',
  flowers: 'زهور وهدايا',
  sports: 'تجهيزات رياضية',
  pharmacy: 'صيدليات وعناية',
  office_equipment: 'أجهزة مكتبية',
  home_appliances: 'أدوات منزلية',
  smoking_hookah: 'سكائر وأراكيل',
};

export function getStoreCategoryLabel(categoryId?: string): string {
  if (!categoryId) return tKey('categories.general', 'عام');
  const normalized = normalizeStoreCategoryId(categoryId) ?? categoryId;
  const shortFallback =
    STORE_CATEGORY_SHORT_NAMES[normalized] ||
    STORE_CATEGORIES.find((c) => c.id === normalized)?.name ||
    categoryId;
  const short = tKey(`categories.${normalized}`, '');
  if (short) return short;
  const full = tKey(`categories.full.${normalized}`, '');
  if (full) return full;
  return shortFallback;
}

/** Full category display name (for merchant forms / filters) */
export function getStoreCategoryFullLabel(categoryId?: string): string {
  if (!categoryId) return tKey('categories.general', 'عام');
  const normalized = normalizeStoreCategoryId(categoryId) ?? categoryId;
  const fallback = STORE_CATEGORIES.find((c) => c.id === normalized)?.name || categoryId;
  return tKey(`categories.full.${normalized}`, fallback);
}
