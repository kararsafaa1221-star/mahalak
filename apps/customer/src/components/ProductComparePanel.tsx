import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRightLeft,
  ChevronRight,
  Info,
  Plus,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Product, Store } from '@shared/types';
import { ProductImage } from '@shared/components/ProductImage';
import {
  buildProductPriceComparison,
  formatPriceDiffLabel,
  getSimilarProducts,
  sortComparisonsByPrice,
  summarizeComparisons,
  type ProductPriceComparison,
} from '@shared/utils/productCompare';

export interface ProductComparePanelProps {
  baseProduct: Product;
  products: Product[];
  storeMap: Map<string, Store>;
  onClose: () => void;
  onBack?: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

function CompareProductCard({
  item,
  storeName,
  onSelect,
  onAddToCart,
}: {
  item: ProductPriceComparison;
  storeName: string;
  onSelect: () => void;
  onAddToCart: () => void;
}) {
  const { product, comparePrice, diff, relation } = item;
  const badgeClass =
    relation === 'cheaper'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
      : relation === 'expensive'
        ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
        : 'bg-white/10 text-white/70 border-white/20';

  const BadgeIcon = relation === 'cheaper' ? TrendingDown : relation === 'expensive' ? TrendingUp : ArrowRightLeft;

  return (
    <article
      onClick={onSelect}
      className="w-[148px] sm:w-[168px] shrink-0 snap-start bg-white rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-slate-50 p-2">
        <ProductImage
          src={product.image}
          alt={product.name}
          size="custom"
          objectFit="contain"
          className="w-full h-full"
          imageClassName="group-hover:scale-105 transition-transform duration-500"
        />
        <span
          className={`absolute bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black ${badgeClass}`}
        >
          <BadgeIcon size={10} />
          <span className="truncate">{formatPriceDiffLabel(diff)}</span>
        </span>
      </div>

      <div className="p-2.5 flex flex-col flex-1 text-right min-h-[118px] bg-gradient-to-r from-[#7B3DFF] to-[#0B1320]">
        <h4 className="font-extrabold text-white text-[11px] sm:text-xs line-clamp-2 leading-snug mb-1.5">
          {product.name}
        </h4>
        <span className="inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border border-white/30 text-[9px] font-bold text-white truncate mb-auto">
          <StoreIcon size={9} className="ml-1 shrink-0" />
          {storeName}
        </span>
        <div className="mt-2 pt-2 border-t border-white/15 flex items-end justify-between gap-1">
          <div className="min-w-0">
            <span className="block text-[8px] text-white/55 font-bold mb-0.5">السعر</span>
            <span className="font-black text-[#fff700] text-sm leading-none">
              {comparePrice.toLocaleString('ar-IQ')}
              <span className="text-[9px] font-bold text-white mr-0.5">د.ع</span>
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className="relative z-10 w-7 h-7 text-white border border-white bg-white/10 hover:bg-[#fff700] hover:text-deep-navy rounded-lg flex items-center justify-center transition-colors shrink-0 active:scale-95 shadow-sm"
            aria-label="أضف إلى السلة"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}

function CompareSection({
  title,
  items,
  storeMap,
  onSelectProduct,
  onAddToCart,
}: {
  title: string;
  items: ProductPriceComparison[];
  storeMap: Map<string, Store>;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h4 className="font-black text-sm text-white">{title}</h4>
        <span className="text-[10px] font-bold text-white/55">{items.length} منتج</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {items.map((item) => (
          <CompareProductCard
            key={item.product.id}
            item={item}
            storeName={storeMap.get(item.product.storeId)?.shopName || 'متجر'}
            onSelect={() => onSelectProduct(item.product)}
            onAddToCart={() => onAddToCart(item.product)}
          />
        ))}
      </div>
    </section>
  );
}

export const ProductComparePanel: React.FC<ProductComparePanelProps> = ({
  baseProduct,
  products,
  storeMap,
  onClose,
  onBack,
  onSelectProduct,
  onAddToCart,
}) => {
  const comparisons = useMemo(() => {
    const similar = getSimilarProducts(baseProduct, products);
    return sortComparisonsByPrice(similar.map((product) => buildProductPriceComparison(baseProduct, product)));
  }, [baseProduct, products]);

  const summary = useMemo(() => summarizeComparisons(comparisons), [comparisons]);
  const basePrice = baseProduct.finalPrice ?? baseProduct.price ?? 0;

  const cheaperItems = comparisons.filter((item) => item.relation === 'cheaper');
  const sameItems = comparisons.filter((item) => item.relation === 'same');
  const expensiveItems = comparisons.filter((item) => item.relation === 'expensive');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 bg-deep-navy/75 backdrop-blur-xl z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        className="bg-gradient-to-b from-[#151d2b] to-[#0B1320] w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col text-right border border-white/10"
        dir="rtl"
      >
        <div className="shrink-0 px-4 py-3 flex items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="flex items-center gap-1.5 text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-3 py-2 text-[11px] font-black transition-all active:scale-95 shrink-0"
          >
            <ChevronRight size={16} />
            <span>رجوع</span>
          </button>
          <div className="min-w-0 text-center flex-1">
            <h3 className="font-black text-white text-sm sm:text-base">مقارنة الأسعار</h3>
            <p className="text-[10px] text-white/70 font-bold truncate">المنتجات المشابهة في متاجر أخرى</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shrink-0 p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shrink-0">
              <ProductImage
                src={baseProduct.image}
                alt={baseProduct.name}
                size="custom"
                objectFit="contain"
                className="w-full h-full"
                variant="dark"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-white/55 mb-1">المنتج الحالي</p>
              <h4 className="font-black text-white text-sm line-clamp-2 leading-snug">{baseProduct.name}</h4>
              <p className="text-[#fff700] font-black text-base mt-1">
                {basePrice.toLocaleString('ar-IQ')}
                <span className="text-[10px] text-white/80 mr-1">د.ع</span>
              </p>
            </div>
          </div>

          {comparisons.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-2 py-2 text-center">
                <p className="text-[9px] text-emerald-300 font-bold">أرخص</p>
                <p className="text-sm font-black text-emerald-200">{summary.cheaper}</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2 text-center">
                <p className="text-[9px] text-white/60 font-bold">نفس السعر</p>
                <p className="text-sm font-black text-white">{summary.same}</p>
              </div>
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-2 py-2 text-center">
                <p className="text-[9px] text-rose-300 font-bold">أغلى</p>
                <p className="text-sm font-black text-rose-200">{summary.expensive}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {comparisons.length === 0 ? (
            <div className="py-16 text-center rounded-[2rem] border border-white/10 bg-white/5 px-6">
              <Info size={36} className="mx-auto mb-3 text-white/35" />
              <p className="font-black text-white text-sm mb-1">لا توجد منتجات مشابهة حالياً</p>
              <p className="text-[11px] font-bold text-white/55 leading-relaxed">
                لم نعثر على منتجات مماثلة في متاجر أخرى. جرّب لاحقاً أو ابحث في تبويب المنتجات.
              </p>
            </div>
          ) : (
            <>
              <CompareSection
                title="خيارات أرخص"
                items={cheaperItems}
                storeMap={storeMap}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
              <CompareSection
                title="نفس السعر تقريباً"
                items={sameItems}
                storeMap={storeMap}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
              <CompareSection
                title="خيارات أعلى سعراً"
                items={expensiveItems}
                storeMap={storeMap}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
