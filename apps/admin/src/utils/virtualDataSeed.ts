import { STORE_CATEGORIES, IRAQ_PROVINCES } from '@shared/constants';

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&auto=format`;

const IRAQI_FIRST_NAMES = [
  'أحمد', 'محمد', 'علي', 'حسين', 'عمر', 'كاظم', 'مصطفى', 'عبدالله', 'حيدر', 'رعد',
  'سالم', 'وليد', 'نزار', 'عماد', 'باسم', 'كرار', 'حسام', 'مهند', 'سجاد', 'طارق',
  'فاطمة', 'زينب', 'رنا', 'سهى', 'نور', 'مريم', 'هبة', 'دعاء', 'إسراء', 'آمنة',
];

const IRAQI_FAMILY_NAMES = [
  'العبيدي', 'الجبوري', 'السعدي', 'المالكي', 'الهاشمي', 'الربيعي', 'الكعبي', 'الزيدي',
  'الدوري', 'العزاوي', 'الشمري', 'العاني', 'البغدادي', 'البصراوي', 'الموصلي', 'الكربلائي',
  'النجفي', 'السامرائي', 'الطائي', 'الجنابي', 'اللامي', 'الخفاجي', 'الحسيني', 'الكاظمي',
];

const AREAS = [
  'الكرادة', 'المنصور', 'الجادرية', 'مدينة الصدر', 'الشعب', 'الدورة', 'الأعظمية', 'الكاظمية', 'زيونة', 'البياع', 'العشار', 'الجنينة', 'المعقل', 'الزبير', 'القبلة', 'الجزائر', 'الطويسة', 'أبو الخصيب', 'الفاو', 'القرنة', 'حي العربي', 'حي الزهور', 'حي الوحدة', 'الميدان', 'حي النبي يونس', 'حي 17 تموز', 'حي الصناع', 'حي الزراعي', 'حي العمال', 'حي المعلمين', 'حي النور', 'حي السلام', 'حي الأندلس', 'حي الرافدين', 'حي الوفاء', 'حي الفرات', 'حي الشهداء', 'حي الزهراء', 'حي البدر', 'حي الجامعة', 'حي الخضراء', 'عينكاوا', '60 متر', 'بازار', 'شورش', 'الإسكان', 'المركز', 'الحي الصناعي', 'الواسطي', 'حي الحسين', 'حي العباس', 'عين تمر',
];

const LANDMARKS = [
  'قرب سوق الشورجة', 'مقابل دوار النسيم', 'بجانب جامع الإمام الأعظم', 'قرب جسر الجادرية',
  'عند مدخل السوق', 'مقابل محطة وقود', 'قرب دوار الكاظمية', 'بجانب مجمع تجاري',
  'قرب سوق الجمعة', 'مقابل مستشفى الحكمة', 'عند تقاطع الشوارع الرئيسي', 'قرب سوق الخضار',
  'بجانب مدرسة حكومية', 'مقابل بنك الرافدين', 'قرب سوق الملابس',
];

const STORE_LOGOS: Record<string, string[]> = {
  supermarket: [
    IMG('1604719312566-8912e9227c6a'),
    IMG('1578916171728-46686eac8d58'),
    IMG('1534723328310-e82dad3ee43f'),
    IMG('1586201375761-83865001e31c'),
  ],
  clothing: [
    IMG('1441986300917-64674bd600d8'),
    IMG('1567401893414-76b7b1e5a7a5'),
    IMG('1558618666-fcd25c85cd64'),
    IMG('1490481651871-ab68de25d43d'),
  ],
  mobiles: [
    IMG('1511707171634-5f897ff02aa9'),
    IMG('1556656793-08538906a9f8'),
    IMG('1592899677977-9c10ca588bbd'),
    IMG('1580910051074-3eb69488602f'),
  ],
  cosmetics: [
    IMG('1596462502278-27bfdc403348'),
    IMG('1522335789203-aabd1fc54bc9'),
    IMG('1571781926291-c477ebfd024b'),
    IMG('1631214524020-7e8686d0a77a'),
  ],
  shoes_bags: [
    IMG('1460353581641-37baddab0fa0'),
    IMG('1549298916-b41d501d3772'),
    IMG('1543163521-1bf539c55dd2'),
    IMG('1594223274512-ad4803739b7c'),
  ],
  sweets: [
    IMG('1558961363-fa8d64e0813f'),
    IMG('1578985545069-69928b1d9587'),
    IMG('1606313564200-e75d5e30476e'),
    IMG('1486427944299-d1955d23e34d'),
  ],
  meats: [
    IMG('1607623814075-e51df1bdc82f'),
    IMG('1603048588665-791ca7aea1f5'),
    IMG('1529692236671-f1f279cf0d8b'),
  ],
  appliances: [
    IMG('1556911220-bff31c812dba'),
    IMG('1585659722983-3f344a8a0c8'),
    IMG('1571175443880-49e1d25b2bc5'),
  ],
  furniture: [
    IMG('1555041469-a586c407b9ae'),
    IMG('1616486338812-3dadae4b4ace'),
    IMG('1618221195710-dd6b41fa6046'),
  ],
  default: [
    IMG('1472851294608-062f824d29cc'),
    IMG('1441984904996-e0b68746c445'),
    IMG('1560472354-b33ff0c44a43'),
  ],
};

const SHOP_NAME_PARTS: Record<string, { prefixes: string[]; cores: string[] }> = {
  supermarket: {
    prefixes: ['سوبر ماركت', 'ماركت', 'بقالة', 'مجمع غذائي', 'سوق'],
    cores: ['الرافدين', 'الفرات', 'الوفاء', 'السلام', 'أبو علي', 'الفلاح', 'الكرادة', 'النور', 'الزيتون', 'البركة'],
  },
  clothing: {
    prefixes: ['بوتيك', 'معرض', 'محل', 'أزياء'],
    cores: ['النور', 'الياسمين', 'بغداد', 'الأناقة', 'الموضة', 'الزهور', 'الملك', 'الأمير', 'السندس', 'الحرير'],
  },
  mobiles: {
    prefixes: ['موبايل', 'تكنو', 'عالم', 'مركز'],
    cores: ['الجوال', 'الذكي', 'الفون', 'الرقم 1', 'السريع', 'الحديث', 'التواصل', 'الشبكة', 'السما', 'الرقمية'],
  },
  cosmetics: {
    prefixes: ['صالون', 'مركز', 'بوتيك', 'محل'],
    cores: ['الجمال', 'الأناقة', 'الزهور', 'اللؤلؤ', 'الورد', 'النعومة', 'السحر', 'الملك', 'الرونق', 'الجاذبية'],
  },
  shoes_bags: {
    prefixes: ['معرض', 'محل', 'بوتيك'],
    cores: ['الأحذية', 'الخطوة', 'السير', 'الحقائب', 'الجلد', 'الأناقة', 'الموضة', 'الراحة', 'الطراز', 'الفخامة'],
  },
  sweets: {
    prefixes: ['حلويات', 'مخبز', 'فرن', 'محل'],
    cores: ['الكرز', 'العسل', 'الشام', 'البلبل', 'السكر', 'البهجة', 'الفرح', 'الكليجة', 'الزعفران', 'الورد'],
  },
  default: {
    prefixes: ['محل', 'معرض', 'مركز', 'سوق'],
    cores: ['الرافدين', 'الوفاء', 'السلام', 'النور', 'الفرات', 'الكرامة', 'الأمل', 'النجاح', 'الازدهار', 'الخير'],
  },
};

type ProductTemplate = {
  name: string;
  description: string;
  image: string;
  minPrice: number;
  maxPrice: number;
};

const CATEGORY_PRODUCTS: Record<string, ProductTemplate[]> = {
  supermarket: [
    { name: 'زيت زيتون بكر 1 لتر', description: 'زيت زيتون أصلي للطبخ والسلطات', image: IMG('1474979266404-7eaacbcd87c5'), minPrice: 8000, maxPrice: 15000 },
    { name: 'أرز بسمتي 5 كغ', description: 'أرز طويل الحبة، جودة ممتازة', image: IMG('1586201375761-83865001e31c'), minPrice: 12000, maxPrice: 22000 },
    { name: 'حليب طازج 1 لتر', description: 'حليب كامل الدسم، مبرد وطازج', image: IMG('1563636619-e9143da7973b'), minPrice: 1500, maxPrice: 2500 },
    { name: 'بيض طازج 30 حبة', description: 'بيض مزارع محلي، طازج يومياً', image: IMG('1582722872445-44dc5f7e5772'), minPrice: 6000, maxPrice: 9000 },
    { name: 'شاي أحمد 500 غ', description: 'شاي أسود فاخر، نكهة غنية', image: IMG('1556679343-c7306c1976bc'), minPrice: 5000, maxPrice: 8000 },
    { name: 'معجون طماطم 400 غ', description: 'معجون مركز للطبخ العراقي', image: IMG('1546094097-3a381df0b4a8'), minPrice: 1500, maxPrice: 3000 },
    { name: 'دجاج طازج كامل', description: 'دجاج مبرد، جاهز للطبخ', image: IMG('1604503468506-a8cb812ad3f5'), minPrice: 7000, maxPrice: 12000 },
    { name: 'خبز عراقي طازج', description: 'خبز تنور ساخن يومياً', image: IMG('1509440159596-0249088772ff'), minPrice: 1000, maxPrice: 2500 },
  ],
  clothing: [
    { name: 'قميص رجالي كتان', description: 'قميص أنيق للمناسبات والعمل', image: IMG('1596755094514-f87e34085b23'), minPrice: 15000, maxPrice: 35000 },
    { name: 'فستان سهرة نسائي', description: 'فستان أنيق للمناسبات', image: IMG('1595777457583-95e059bfb644'), minPrice: 35000, maxPrice: 85000 },
    { name: 'بنطلون جينز', description: 'جينز مريح، قصة عصرية', image: IMG('1542272604-787c3835535d'), minPrice: 20000, maxPrice: 45000 },
    { name: 'عباية نسائية', description: 'عباية أنيقة، ألوان متعددة', image: IMG('1617137968427-85924c4936de'), minPrice: 25000, maxPrice: 60000 },
    { name: 'بدلة رجالية', description: 'بدلة للمناسبات والأعراس', image: IMG('1593030761757-71faebbbf839'), minPrice: 80000, maxPrice: 150000 },
    { name: 'تيشيرت رياضي', description: 'تيشيرت قطن مريح', image: IMG('1521572163474-6864f9cf2abb'), minPrice: 8000, maxPrice: 18000 },
  ],
  mobiles: [
    { name: 'آيفون 15 برو', description: '256 جيجا، ضمان سنة، جديد', image: IMG('1695048133142-439a4474f349'), minPrice: 1200000, maxPrice: 1500000 },
    { name: 'سامسونج Galaxy S24', description: '128 جيجا، شاشة AMOLED', image: IMG('1610945265064-0e34d551d2b1'), minPrice: 900000, maxPrice: 1200000 },
    { name: 'سماعات AirPods Pro', description: 'إلغاء ضوضاء، شحن لاسلكي', image: IMG('1606220945770-b5b6b66e7b0f'), minPrice: 180000, maxPrice: 280000 },
    { name: 'شاحن سريع 65W', description: 'شاحن Type-C سريع', image: IMG('1583394838334-acd7cde31043'), minPrice: 15000, maxPrice: 35000 },
    { name: 'كفر حماية شفاف', description: 'كفر سيليكون، حماية كاملة', image: IMG('1601784551446-20c9e95bdb2b'), minPrice: 5000, maxPrice: 15000 },
    { name: 'تابلت iPad', description: '64 جيجا، مناسب للدراسة', image: IMG('1544244015-0df4b3b6c7c4'), minPrice: 600000, maxPrice: 850000 },
  ],
  cosmetics: [
    { name: 'عطر رجالي 100 مل', description: 'عطر فاخر، ثبات طويل', image: IMG('1541643600914-2b7693839438'), minPrice: 45000, maxPrice: 120000 },
    { name: 'كريم مرطب للوجه', description: 'ترطيب عميق لجميع أنواع البشرة', image: IMG('1556228720-195a672e8e78'), minPrice: 12000, maxPrice: 35000 },
    { name: 'مجموعة مكياج', description: 'أحمر شفاه، ظلال عيون، كونسيلر', image: IMG('1522335789203-aabd1fc54bc9'), minPrice: 25000, maxPrice: 65000 },
    { name: 'شامبو للشعر', description: 'ترميم وتغذية للشعر', image: IMG('1535585209827-a15d362d0296'), minPrice: 8000, maxPrice: 18000 },
    { name: 'بخور عود كمبودي', description: 'عود أصلي للمناسبات', image: IMG('1603006905004-8f5c0f7c8b8b'), minPrice: 30000, maxPrice: 80000 },
  ],
  shoes_bags: [
    { name: 'حذاء رياضي', description: 'حذاء مريح، مقاسات 40-45', image: IMG('1542291026-7eec264cc27e'), minPrice: 85000, maxPrice: 180000 },
    { name: 'حذاء رسمي جلد', description: 'حذاء جلد للمناسبات', image: IMG('1614252238956-2693b5d602d4'), minPrice: 45000, maxPrice: 95000 },
    { name: 'حقيبة يد نسائية', description: 'حقيبة جلد أنيقة', image: IMG('1548036328-c9fa089c4e8b'), minPrice: 35000, maxPrice: 85000 },
    { name: 'حقيبة سفر', description: 'حقيبة متينة، عجلات دوارة', image: IMG('1565026057377-82d838493b3f'), minPrice: 55000, maxPrice: 120000 },
    { name: 'صندل صيفي', description: 'صندل مريح للصيف', image: IMG('1603487748691-5715a0a4a0a4'), minPrice: 15000, maxPrice: 35000 },
  ],
  sweets: [
    { name: 'كليجة بالتمر 1 كغ', description: 'كليجة عراقية تقليدية', image: IMG('1606313564200-e75d5e30476e'), minPrice: 8000, maxPrice: 15000 },
    { name: 'بقلاوة بالفستق', description: 'بقلاوة فاخرة، فستق حلبي', image: IMG('1578985545069-69928b1d9587'), minPrice: 12000, maxPrice: 25000 },
    { name: 'كيكة شوكولاتة', description: 'كيكة غنية للمناسبات', image: IMG('1578985545069-69928b1d9587'), minPrice: 15000, maxPrice: 35000 },
    { name: 'مكسرات مشكلة', description: 'فستق، كاجو، لوز، زبيب', image: IMG('1599599810764-3cb0f1e7c5c5'), minPrice: 18000, maxPrice: 35000 },
    { name: 'عصير برتقال', description: 'عصير طازج بدون مواد حافظة', image: IMG('1613478885999-3aef9ab379d5'), minPrice: 3000, maxPrice: 6000 },
  ],
  meats: [
    { name: 'لحم غنم طازج 1 كغ', description: 'لحم طازج، ذبح يومي', image: IMG('1607623814075-e51df1bdc82f'), minPrice: 18000, maxPrice: 28000 },
    { name: 'دجاج مجمد 2 كغ', description: 'دجاج مجمد، جودة عالية', image: IMG('1604503468506-a8cb812ad3f5'), minPrice: 8000, maxPrice: 14000 },
    { name: 'سمك فيليه طازج', description: 'سمك طازج من الأسواق', image: IMG('1519708227411-cc8aad6b313d'), minPrice: 12000, maxPrice: 22000 },
  ],
  appliances: [
    { name: 'ثلاجة 16 قدم', description: 'ثلاجة حديثة، موفرة للطاقة', image: IMG('1571175443880-49e1d25b2bc5'), minPrice: 650000, maxPrice: 950000 },
    { name: 'غسالة أوتوماتيك', description: 'غسالة 8 كغ، برامج متعددة', image: IMG('1626806788947-109ee817a5eb'), minPrice: 450000, maxPrice: 750000 },
    { name: 'تلفزيون 55 بوصة', description: 'شاشة ذكية 4K', image: IMG('1593359677878-a4bb92f829d1'), minPrice: 550000, maxPrice: 900000 },
  ],
};

const DEFAULT_PRODUCTS: ProductTemplate[] = [
  { name: 'منتج مميز', description: 'جودة عالية وسعر مناسب', image: IMG('1505740420928-5e560c06d30e'), minPrice: 5000, maxPrice: 50000 },
  { name: 'عرض خاص', description: 'منتج مختار بعناية', image: IMG('1523275335684-37898b6baf30'), minPrice: 8000, maxPrice: 45000 },
  { name: 'بضاعة جديدة', description: 'وصل حديثاً للمتجر', image: IMG('1560343090-f0409e92791a'), minPrice: 10000, maxPrice: 60000 },
];

const PROVINCE_COORD_LIST: [number, number][] = [
  [33.315, 44.366], [30.508, 47.783], [36.34, 43.118], [36.191, 44.009], [35.557, 45.435], [36.867, 42.988],
  [35.468, 44.392], [33.748, 44.643], [33.42, 43.307], [32.512, 45.818], [32.482, 44.421], [32.616, 44.024],
  [32.0, 44.333], [31.835, 47.144], [31.046, 46.257], [31.316, 45.294], [31.989, 44.924], [34.597, 43.678],
];

function getProvinceCoords(province: string) {
  const idx = IRAQ_PROVINCES.findIndex((p) => p.name === province);
  const [lat, lng] = PROVINCE_COORD_LIST[idx >= 0 ? idx : 0];
  return { lat, lng };
}

const IRAQ_PROVINCES_LIST = IRAQ_PROVINCES.map((p) => p.name);
const VIRTUAL_CATEGORIES = STORE_CATEGORIES.map((c) => c.id);

export function buildVirtualStore(index: number, batchTs: number) {
  const cat = pick(VIRTUAL_CATEGORIES, index);
  const province = pick(IRAQ_PROVINCES_LIST, index);
  const area = pick(AREAS, index * 3 + 1);
  const landmark = pick(LANDMARKS, index * 7 + 2);

  const ownerName = `${pick(IRAQI_FIRST_NAMES, index * 11)} ${pick(IRAQI_FAMILY_NAMES, index * 13 + 5)}`;

  const nameParts = SHOP_NAME_PARTS[cat] ?? SHOP_NAME_PARTS.default;
  const shopName = `${pick(nameParts.prefixes, index)} ${pick(nameParts.cores, index + 17)}`;

  const logo = pick(STORE_LOGOS[cat] ?? STORE_LOGOS.default, index);

  const coords = getProvinceCoords(province);
  const lat = coords.lat + (Math.random() - 0.5) * 0.08;
  const lng = coords.lng + (Math.random() - 0.5) * 0.08;

  const phonePrefix = pick(['077', '078', '079'] as const, index);
  const phone = `${phonePrefix}${String(10000000 + ((index * 7919) % 89999999)).slice(0, 8)}`;

  return {
    storeId: `virtual-store-${batchTs}-${index}`,
    ownerName,
    shopName,
    category: cat,
    username: `store_${batchTs}_${index}`,
    phone,
    province,
    area,
    landmark,
    lat,
    lng,
    logo,
  };
}

export function buildVirtualProduct(
  storeId: string,
  category: string,
  storeIndex: number,
  productIndex: number,
  batchTs: number,
) {
  const template = pick(CATEGORY_PRODUCTS[category] ?? DEFAULT_PRODUCTS, storeIndex * 100 + productIndex);
  const price =
    template.minPrice +
    Math.floor(Math.random() * (template.maxPrice - template.minPrice + 1));

  return {
    productId: `virtual-prod-${batchTs}-${storeIndex}-${productIndex}`,
    storeId,
    name: template.name,
    description: template.description,
    price,
    finalPrice: price,
    image: template.image,
    category,
  };
}
