import type { Product } from '../types';

export type ProductPriceComparison = {
  product: Product;
  basePrice: number;
  comparePrice: number;
  diff: number;
  relation: 'cheaper' | 'expensive' | 'same';
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokenizeName(name: string): string[] {
  return normalizeText(name)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function resolveProductPrice(product: Product): number {
  return product.finalPrice ?? product.price ?? 0;
}

function similarityScore(base: Product, candidate: Product): number {
  if (base.id === candidate.id || base.storeId === candidate.storeId) return -1;

  let score = 0;

  const baseCategory = normalizeText(base.category || '');
  const candidateCategory = normalizeText(candidate.category || '');
  if (baseCategory && candidateCategory && baseCategory === candidateCategory) {
    score += 45;
  } else if (baseCategory && candidateCategory && (baseCategory.includes(candidateCategory) || candidateCategory.includes(baseCategory))) {
    score += 25;
  }

  const baseTags = new Set((base.tags || []).map(normalizeText).filter(Boolean));
  for (const tag of candidate.tags || []) {
    const normalized = normalizeText(tag);
    if (normalized && baseTags.has(normalized)) score += 12;
  }

  const baseName = normalizeText(base.name || '');
  const candidateName = normalizeText(candidate.name || '');
  if (baseName && candidateName) {
    if (baseName === candidateName) score += 35;
    else if (baseName.includes(candidateName) || candidateName.includes(baseName)) score += 28;

    const baseTokens = tokenizeName(base.name || '');
    const candidateTokens = tokenizeName(candidate.name || '');
    const sharedTokens = baseTokens.filter((token) =>
      candidateTokens.some((other) => other.includes(token) || token.includes(other)),
    );
    score += sharedTokens.length * 8;
  }

  if (base.brand && candidate.brand && normalizeText(base.brand) === normalizeText(candidate.brand)) {
    score += 10;
  }

  return score;
}

export function buildProductPriceComparison(base: Product, candidate: Product): ProductPriceComparison {
  const basePrice = resolveProductPrice(base);
  const comparePrice = resolveProductPrice(candidate);
  const diff = comparePrice - basePrice;

  return {
    product: candidate,
    basePrice,
    comparePrice,
    diff,
    relation: diff === 0 ? 'same' : diff < 0 ? 'cheaper' : 'expensive',
  };
}

export function getSimilarProducts(
  base: Product,
  products: Product[],
  options?: { minScore?: number; limit?: number },
): Product[] {
  const minScore = options?.minScore ?? 12;
  const limit = options?.limit ?? 40;

  return products
    .map((product) => ({ product, score: similarityScore(base, product) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return resolveProductPrice(a.product) - resolveProductPrice(b.product);
    })
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function sortComparisonsByPrice(comparisons: ProductPriceComparison[]): ProductPriceComparison[] {
  return [...comparisons].sort((a, b) => a.comparePrice - b.comparePrice);
}

export function summarizeComparisons(comparisons: ProductPriceComparison[]) {
  return comparisons.reduce(
    (acc, item) => {
      if (item.relation === 'cheaper') acc.cheaper += 1;
      else if (item.relation === 'expensive') acc.expensive += 1;
      else acc.same += 1;
      return acc;
    },
    { cheaper: 0, expensive: 0, same: 0, total: comparisons.length },
  );
}

export function formatPriceDiffLabel(diff: number): string {
  const amount = Math.abs(diff).toLocaleString('ar-IQ');
  if (diff === 0) return 'نفس السعر';
  if (diff < 0) return `أرخص بـ ${amount} د.ع`;
  return `أغلى بـ ${amount} د.ع`;
}
