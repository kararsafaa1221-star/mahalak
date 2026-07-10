import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Share2 } from 'lucide-react';
import type { Product } from '@shared/types';
import {
  BULK_QUANTITY_LABEL,
  getProductAvailabilityLabel,
  isBulkQuantityProduct,
  isProductOutOfStock,
} from '@shared/utils/productInventory';
import {
  groupStoreProductsByCategory,
  sectionPreviewProducts,
  type StoreProductSection,
} from '@shared/utils/storeProductGrouping';

interface StoreProductSectionsProps {
  products: Product[];
  getStoreName: (product: Product) => string;
  storeCategoryId?: string;
  variant?: 'default' | 'onDark';
  emptyTitle?: string;
  emptySubtitle?: string;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
}

function StoreProductCard({
  product,
  storeName,
  layout = 'scroll',
  onProductClick,
  onAddToCart,
  onShareProduct,
}: {
  product: Product;
  storeName: string;
  layout?: 'scroll' | 'grid';
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
}) {
  return (
    <article
      onClick={() => onProductClick(product)}
      className={`${layout === 'scroll' ? 'w-[148px] sm:w-[168px] shrink-0 snap-start' : 'w-full'} bg-white rounded-2xl border border-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col`}
    >
      <div className="relative aspect-square bg-slate-50 p-2">
        <img
          src={product.image || undefined}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        {product.specialOffer && (
          <span className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded-md border border-amber-200/80">
            {product.specialOffer}
          </span>
        )}
        {product.discountType !== 'none' && (
          <span className="absolute bottom-2 left-2 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
            {product.discountType === 'percent' ? `-${product.discountValue}%` : 'خصم'}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShareProduct(product);
          }}
          className="absolute top-2 left-2 z-10 p-1.5 bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] text-white border border-white rounded-lg shadow-sm active:scale-95 transition-transform"
          aria-label="مشاركة المنتج"
        >
          <Share2 size={12} />
        </button>
      </div>

      <div className="p-2.5 flex flex-col flex-1 text-right min-h-[108px] bg-gradient-to-r from-[#7B3DFF] to-[#0B1320]">
        <h4 className="font-extrabold text-white text-[11px] sm:text-xs line-clamp-2 leading-snug mb-1.5">
          {product.name}
        </h4>
        {(isBulkQuantityProduct(product.inventory) || isProductOutOfStock(product.inventory)) && (
          <span className={`inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border text-[8px] font-bold truncate mb-1 ${
            isProductOutOfStock(product.inventory)
              ? 'border-rose-200 text-rose-600 bg-rose-50'
              : 'border-emerald-200 text-emerald-700 bg-emerald-50'
          }`}>
            {isBulkQuantityProduct(product.inventory) ? BULK_QUANTITY_LABEL : getProductAvailabilityLabel(product.inventory)}
          </span>
        )}
        <span className="inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border border-white text-[9px] font-bold text-white truncate mb-auto">
          {storeName}
        </span>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-end justify-between gap-1">
          <div className="min-w-0">
            {product.discountType !== 'none' && (
              <span className="block text-[9px] text-slate-400 line-through font-bold">
                {(product.price || 0).toLocaleString()} د.ع
              </span>
            )}
            <span className="font-black text-[#fff700] text-sm sm:text-base leading-none">
              {(product.finalPrice || 0).toLocaleString()}
              <span className="text-[9px] font-bold text-white mr-0.5">د.ع</span>
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="relative z-10 w-7 h-7 bg-white text-vibrant-purple rounded-lg flex items-center justify-center hover:bg-[#fff700] hover:text-deep-navy transition-colors shrink-0 active:scale-95 shadow-sm"
            aria-label="أضف إلى السلة"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  section,
  getStoreName,
  expanded,
  onToggleExpand,
  onProductClick,
  onAddToCart,
  onShareProduct,
  onDark = false,
}: {
  section: StoreProductSection;
  getStoreName: (product: Product) => string;
  expanded: boolean;
  onToggleExpand: () => void;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  onDark?: boolean;
}) {
  const visibleProducts = sectionPreviewProducts(section, expanded);
  const hasMore = section.products.length > visibleProducts.length;

  return (
    <section className="scroll-mt-28">
      <div className="flex items-center justify-between gap-3 mb-3 px-0.5">
        <h3 className={`font-black text-sm sm:text-base ${onDark ? 'text-white' : 'text-slate-900'}`}>{section.title}</h3>
        {(hasMore || expanded) && section.products.length > 4 && (
          <button
            type="button"
            onClick={onToggleExpand}
            className={`flex items-center gap-0.5 text-xs sm:text-sm font-bold hover:underline shrink-0 ${onDark ? 'text-[#E9DAFF]' : 'text-[#c41e3a]'}`}
          >
            {expanded ? 'عرض أقل' : 'عرض الكل'}
            {!expanded && <ChevronLeft size={16} className="rotate-180" />}
          </button>
        )}
      </div>

      {expanded ? (
        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 gap-3">
          {section.products.map((product) => (
            <StoreProductCard
              key={product.id}
              layout="grid"
              product={product}
              storeName={getStoreName(product)}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              onShareProduct={onShareProduct}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
          {visibleProducts.map((product) => (
            <StoreProductCard
              key={product.id}
              product={product}
              storeName={getStoreName(product)}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              onShareProduct={onShareProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export const StoreProductSections: React.FC<StoreProductSectionsProps> = ({
  products,
  getStoreName,
  storeCategoryId,
  variant = 'onDark',
  emptyTitle = 'لا توجد منتجات حالياً',
  emptySubtitle = 'لم ينشر هذا المتجر منتجات بعد.',
  onProductClick,
  onAddToCart,
  onShareProduct,
}) => {
  const onDark = variant === 'onDark';
  const sections = useMemo(
    () => groupStoreProductsByCategory(products, storeCategoryId),
    [products, storeCategoryId],
  );

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  if (!sections.length) {
    return onDark ? (
      <div className="py-20 text-center bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] rounded-[2.5rem] border border-white/10 brand-gradient-border shadow-sm px-8">
        <p className="text-white font-black text-lg mb-2">{emptyTitle}</p>
        <p className="text-white/70 text-xs font-bold">{emptySubtitle}</p>
      </div>
    ) : (
      <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm px-8">
        <p className="text-violet font-black text-lg mb-2">{emptyTitle}</p>
        <p className="text-slate-400 text-xs font-bold">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          getStoreName={getStoreName}
          expanded={!!expandedSections[section.id]}
          onDark={onDark}
          onToggleExpand={() =>
            setExpandedSections((prev) => ({
              ...prev,
              [section.id]: !prev[section.id],
            }))
          }
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          onShareProduct={onShareProduct}
        />
      ))}
    </div>
  );
};
