import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Share2 } from 'lucide-react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import {
  BULK_QUANTITY_LABEL,
  getProductAvailabilityLabel,
  isBulkQuantityProduct,
  isProductOutOfStock,
} from '../utils/productInventory';
import {
  groupStoreProductsByCategory,
  sectionPreviewProducts,
  type StoreProductSection,
} from '../utils/storeProductGrouping';
import {
  resolveStoreTheme,
  storeGradientProps,
  storeProductCardGradientProps,
  themeFieldBackgroundStyle,
  themeFieldIconColor,
  themeFieldTextStyle,
  type ResolvedStoreTheme,
} from '../utils/storeTheme';

export interface StoreProductSectionsProps {
  products: Product[];
  getStoreName: (product: Product) => string;
  storeCategoryId?: string;
  variant?: 'default' | 'onDark';
  emptyTitle?: string;
  emptySubtitle?: string;
  storeTheme?: ResolvedStoreTheme;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  onStoreClick?: (product: Product) => void;
  showStoreName?: boolean;
}

function StoreProductCard({
  product,
  storeName,
  layout = 'scroll',
  priority = false,
  storeTheme,
  onProductClick,
  onAddToCart,
  onShareProduct,
  onStoreClick,
  showStoreName = true,
}: {
  product: Product;
  storeName: string;
  layout?: 'scroll' | 'grid';
  priority?: boolean;
  storeTheme?: ResolvedStoreTheme;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  onStoreClick?: (product: Product) => void;
  showStoreName?: boolean;
}) {
  const theme = storeTheme ?? resolveStoreTheme(null);
  const footerGradient = storeProductCardGradientProps(theme);
  const shareBtn = storeGradientProps(theme);
  const accentPriceStyle = theme.enabled ? themeFieldTextStyle(theme.fields.productPriceColor) : undefined;
  const accentPriceClass = theme.enabled ? '' : 'text-[#fff700]';
  const addBtnStyle = theme.enabled
    ? {
        ...themeFieldBackgroundStyle(theme.fields.addToCartButtonBg),
        color: themeFieldIconColor(theme.fields.addToCartIconColor),
      }
    : undefined;
  const addBtnClass = theme.enabled
    ? ''
    : 'text-white border border-white bg-gradient-to-r from-[#7B3DFF] to-[#0B1320] [background-clip:unset] [-webkit-background-clip:unset] hover:bg-[#fff700] hover:text-deep-navy';
  const cardTextStyle = theme.enabled ? themeFieldTextStyle(theme.fields.productCardTextColor) : undefined;
  const storeNameClassName = `inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border text-[9px] font-bold truncate mb-auto ${
    theme.enabled ? '' : 'border-white text-white'
  }`;
  const storeNameStyle = theme.enabled
    ? {
        ...themeFieldTextStyle(theme.fields.productCardTextColor),
        borderColor: `${theme.fields.productCardTextColor.solid}55`,
      }
    : undefined;

  return (
    <article
      onClick={() => onProductClick(product)}
      className={`${layout === 'scroll' ? 'w-[148px] sm:w-[168px] shrink-0 snap-start' : 'w-full'} bg-white rounded-2xl border border-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col`}
    >
      <div className="relative aspect-square bg-slate-50 p-2">
        <ProductImage
          src={product.image}
          alt={product.name}
          size="custom"
          priority={priority}
          objectFit="contain"
          className="w-full h-full"
          imageClassName="group-hover:scale-105 transition-transform duration-500"
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
          className={`absolute top-2 left-2 z-10 p-1.5 text-white border border-white rounded-lg shadow-sm active:scale-95 transition-transform ${shareBtn.className}`}
          style={shareBtn.style}
          aria-label="مشاركة المنتج"
        >
          <Share2 size={12} />
        </button>
      </div>

      <div
        className={`p-2.5 flex flex-col flex-1 text-right min-h-[108px] ${footerGradient.className}`}
        style={footerGradient.style}
      >
        <h4
          className="font-extrabold text-[11px] sm:text-xs line-clamp-2 leading-snug mb-1.5"
          style={cardTextStyle}
        >
          {product.name}
        </h4>
        {(isBulkQuantityProduct(product.inventory) || isProductOutOfStock(product.inventory)) && (
          <span
            className={`inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border text-[8px] font-bold truncate mb-1 ${
              isProductOutOfStock(product.inventory)
                ? 'border-rose-200 text-rose-600 bg-rose-50'
                : 'border-emerald-200 text-emerald-700 bg-emerald-50'
            }`}
          >
            {isBulkQuantityProduct(product.inventory)
              ? BULK_QUANTITY_LABEL
              : getProductAvailabilityLabel(product.inventory)}
          </span>
        )}
        {showStoreName && (
          onStoreClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStoreClick(product);
              }}
              className={`${storeNameClassName} cursor-pointer hover:bg-white/10 transition-colors`}
              style={storeNameStyle}
            >
              {storeName}
            </button>
          ) : (
            <span className={storeNameClassName} style={storeNameStyle}>
              {storeName}
            </span>
          )
        )}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-end justify-between gap-1">
          <div className="min-w-0">
            {product.discountType !== 'none' && (
              <span className="block text-[9px] text-slate-400 line-through font-bold">
                {(product.price || 0).toLocaleString()} د.ع
              </span>
            )}
            <span className={`font-black text-sm sm:text-base leading-none ${accentPriceClass}`} style={accentPriceStyle}>
              {(product.finalPrice || 0).toLocaleString()}
              <span
                className={`text-[9px] font-bold mr-0.5 ${theme.enabled ? '' : 'text-white'}`}
                style={theme.enabled ? themeFieldTextStyle(theme.fields.productCardTextColor) : undefined}
              >
                د.ع
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 active:scale-95 shadow-sm ${addBtnClass}`}
            style={addBtnStyle}
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
  onStoreClick,
  showStoreName = true,
  onDark = false,
  storeTheme,
}: {
  section: StoreProductSection;
  getStoreName: (product: Product) => string;
  expanded: boolean;
  onToggleExpand: () => void;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  onStoreClick?: (product: Product) => void;
  showStoreName?: boolean;
  onDark?: boolean;
  storeTheme?: ResolvedStoreTheme;
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
              storeTheme={storeTheme}
              priority
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              onShareProduct={onShareProduct}
              onStoreClick={onStoreClick}
              showStoreName={showStoreName}
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
              storeTheme={storeTheme}
              priority
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              onShareProduct={onShareProduct}
              onStoreClick={onStoreClick}
              showStoreName={showStoreName}
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
  storeTheme,
  onProductClick,
  onAddToCart,
  onShareProduct,
  onStoreClick,
  showStoreName = true,
}) => {
  const onDark = variant === 'onDark';
  const theme = storeTheme ?? resolveStoreTheme(null);
  const emptyPanel = storeGradientProps(theme);
  const sections = useMemo(
    () => groupStoreProductsByCategory(products, storeCategoryId),
    [products, storeCategoryId],
  );

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  if (!sections.length) {
    return onDark ? (
      <div
        className={`py-20 text-center rounded-[2.5rem] shadow-sm px-8 ${
          theme.enabled
            ? `border border-white/10 brand-gradient-border ${emptyPanel.className}`
            : 'welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md'
        }`}
        style={theme.enabled ? emptyPanel.style : undefined}
      >
        <p
          className={`font-black text-lg mb-2 ${theme.enabled ? '' : 'text-white'}`}
          style={theme.enabled ? themeFieldTextStyle(theme.fields.productCardTextColor) : undefined}
        >
          {emptyTitle}
        </p>
        <p
          className={`text-xs font-bold ${theme.enabled ? '' : 'text-white/70'}`}
          style={
            theme.enabled
              ? { ...themeFieldTextStyle(theme.fields.productCardTextColor), opacity: 0.7 }
              : undefined
          }
        >
          {emptySubtitle}
        </p>
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
          storeTheme={storeTheme}
          onToggleExpand={() =>
            setExpandedSections((prev) => ({
              ...prev,
              [section.id]: !prev[section.id],
            }))
          }
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          onShareProduct={onShareProduct}
          onStoreClick={onStoreClick}
          showStoreName={showStoreName}
        />
      ))}
    </div>
  );
};
