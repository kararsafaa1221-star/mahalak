import { getStoreCategoryLabel, STORE_CATEGORIES } from '@shared/constants';
import type { Product } from '@shared/types';

export interface StoreProductSection {
  id: string;
  title: string;
  products: Product[];
}

const OTHER_SECTION_ID = 'other-products';

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatSectionTitle(key: string): string {
  if (key === OTHER_SECTION_ID) return 'منتجات أخرى';
  return getStoreCategoryLabel(key);
}

function resolveProductCategoryKey(
  product: Product,
  predefinedSubs: string[],
): string | null {
  const category = (product.category || '').trim();
  if (category) return category;

  const tagMatch = (product.tags || []).find((tag) =>
    predefinedSubs.some((sub) => normalizeKey(sub) === normalizeKey(tag)),
  );
  if (tagMatch) return tagMatch;

  const firstTag = (product.tags || []).find((tag) => tag.trim());
  return firstTag?.trim() || null;
}

/** Group products into category sections (no popular section). */
export function groupStoreProductsByCategory(
  products: Product[],
  storeCategoryId?: string,
): StoreProductSection[] {
  if (!products.length) return [];

  const storeCategory = STORE_CATEGORIES.find((c) => c.id === storeCategoryId);
  const predefinedSubs = storeCategory?.sub || [];

  const buckets = new Map<string, Product[]>();

  products.forEach((product) => {
    const key = resolveProductCategoryKey(product, predefinedSubs);
    const bucketKey = key || OTHER_SECTION_ID;
    const list = buckets.get(bucketKey) || [];
    list.push(product);
    buckets.set(bucketKey, list);
  });

  const orderedKeys: string[] = [];

  predefinedSubs.forEach((sub) => {
    if (buckets.has(sub)) orderedKeys.push(sub);
  });

  [...buckets.keys()]
    .filter((key) => key !== OTHER_SECTION_ID && !orderedKeys.includes(key))
    .sort((a, b) => formatSectionTitle(a).localeCompare(formatSectionTitle(b), 'ar'))
    .forEach((key) => orderedKeys.push(key));

  if (buckets.has(OTHER_SECTION_ID)) {
    orderedKeys.push(OTHER_SECTION_ID);
  }

  const sections: StoreProductSection[] = [];

  orderedKeys.forEach((key) => {
    const bucketProducts = buckets.get(key);
    if (!bucketProducts?.length) return;

    sections.push({
      id: `cat-${normalizeKey(key).replace(/\s+/g, '-')}`,
      title: formatSectionTitle(key),
      products: bucketProducts,
    });
  });

  return sections;
}

export function sectionPreviewProducts(section: StoreProductSection, expanded: boolean, limit = 8) {
  if (expanded) return section.products;
  return section.products.slice(0, limit);
}
