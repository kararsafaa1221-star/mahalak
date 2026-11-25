import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { VirtualizedGrid } from './VirtualizedGrid';
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
import { formatStoreUsername } from '../utils/storeIdentity';
import { VerifiedBadge } from './VerifiedBadge';
import { OfferPercentBadge, formatProductOfferBadgeLabel } from './OfferPercentBadge';

export interface StoreProductSectionsProps {
  products: Product[];
  getStoreName: (product: Product) => string;
  getStoreUsername?: (product: Product) => string | undefined;
  getStoreVerified?: (product: Product) => boolean;
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

const StoreProductCard = React.memo(function StoreProductCard({
  product,
  storeName,
  storeUsername,
  storeVerified = false,
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
  storeUsername?: string;
  storeVerified?: boolean;
  layout?: 'scroll' | 'grid';
  priority?: boolean;
  storeTheme?: ResolvedStoreTheme;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  onStoreClick?: (product: Product) => void;
  showStoreName?: boolean;
}) {
  const { t } = useTranslation();
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
    : 'welcome-btn-pulse text-white border border-white/40 bg-white/10 hover:bg-[#fff700] hover:text-deep-navy';
  const cardTextStyle = theme.enabled ? themeFieldTextStyle(theme.fields.productCardTextColor) : undefined;
  const storeNameClassName = `inline-flex flex-col gap-0 self-start max-w-full px-2 py-0.5 rounded-lg border text-[9px] font-bold mb-auto text-right ${
    theme.enabled ? '' : 'border-white text-white'
  }`;
  const storeNameStyle = theme.enabled
    ? {
        ...themeFieldTextStyle(theme.fields.productCardTextColor),
        borderColor: `${theme.fields.productCardTextColor.solid}55`,
      }
    : undefined;
  const storeHandle = formatStoreUsername(storeUsername);
  const storeBadgeContent = (
    <>
      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
        <span className="truncate leading-tight">{storeName}</span>
        {storeVerified && <VerifiedBadge size={10} className="shrink-0" />}
      </span>
      {storeHandle ? (
        <span className="truncate max-w-full text-[8px] font-bold opacity-80 leading-tight" dir="ltr">
          {storeHandle}
        </span>
      ) : null}
    </>
  );

  return (
    <article
      onClick={() => onProductClick(product)}
      className={`${layout === 'scroll' ? 'w-[148px] sm:w-[168px] shrink-0 snap-start' : 'w-full'} rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col ${
        theme.enabled
          ? 'bg-white border-white shadow-sm hover:shadow-md'
          : 'welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border-white/30 backdrop-blur-md shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-vibrant-purple/25 hover:-translate-y-0.5'
      }`}
    >
      <div className={`relative aspect-square p-2 ${theme.enabled ? 'bg-slate-50' : 'bg-white/10 border-b border-white/10'}`}>
        <ProductImage
          src={product.image}
          alt={product.name}
          size="custom"
          priority={priority}
          objectFit="contain"
          variant={theme.enabled ? 'light' : 'dark'}
          className="w-full h-full"
          imageClassName="group-hover:scale-105 transition-transform duration-500"
        />
        {product.specialOffer && (
          <span className={`absolute bottom-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-md border z-[15] ${
            theme.enabled
              ? 'bg-amber-100 text-amber-800 border-amber-200/80'
              : 'bg-white/15 text-[#fff700] border-white/30 backdrop-blur-sm'
          }`}>
            {product.specialOffer}
          </span>
        )}
        {(() => {
          const offerLabel = formatProductOfferBadgeLabel(product, t('products.discount'));
          return offerLabel ? (
            <OfferPercentBadge
              label={offerLabel}
              variant="pill"
              size="sm"
              placement="card"
            />
          ) : null;
        })()}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShareProduct(product);
          }}
          className={`absolute top-2 left-2 z-10 p-1.5 text-white border border-white/40 rounded-lg shadow-sm active:scale-95 transition-transform ${
            theme.enabled ? shareBtn.className : 'welcome-btn-pulse bg-white/10 backdrop-blur-sm'
          }`}
          style={theme.enabled ? shareBtn.style : undefined}
          aria-label={t('products.shareProduct')}
        >
          <Share2 size={12} />
        </button>
      </div>

      <div
        className={`p-2.5 flex flex-col flex-1 text-right min-h-[108px] ${
          theme.enabled
            ? footerGradient.className
            : 'border-t border-white/15'
        }`}
        style={theme.enabled ? footerGradient.style : undefined}
      >
        <h4
          className={`font-extrabold text-[11px] sm:text-xs line-clamp-2 leading-snug mb-1.5 ${theme.enabled ? '' : 'text-white'}`}
          style={cardTextStyle}
        >
          {product.name}
        </h4>
        {(isBulkQuantityProduct(product.inventory) || isProductOutOfStock(product.inventory)) && (
          <span
            className={`inline-flex self-start max-w-full px-2 py-0.5 rounded-lg border text-[8px] font-bold truncate mb-1 ${
              isProductOutOfStock(product.inventory)
                ? theme.enabled
                  ? 'border-rose-200 text-rose-600 bg-rose-50'
                  : 'border-rose-400/30 text-rose-200 bg-rose-500/15'
                : theme.enabled
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-emerald-400/30 text-emerald-200 bg-emerald-500/15'
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
              title={storeHandle ? `${storeName} ${storeHandle}` : storeName}
            >
              {storeBadgeContent}
            </button>
          ) : (
            <span
              className={storeNameClassName}
              style={storeNameStyle}
              title={storeHandle ? `${storeName} ${storeHandle}` : storeName}
            >
              {storeBadgeContent}
            </span>
          )
        )}
        <div className={`mt-2 pt-2 flex items-end justify-between gap-1 ${theme.enabled ? 'border-t border-slate-100' : 'border-t border-white/15'}`}>
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
            aria-label={t('products.addToCart')}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
});

function SectionBlock({
  section,
  getStoreName,
  getStoreUsername,
  getStoreVerified,
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
  getStoreUsername?: (product: Product) => string | undefined;
  getStoreVerified?: (product: Product) => boolean;
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
  const { t } = useTranslation();
  const visibleProducts = sectionPreviewProducts(section, expanded);
  const hasMore = section.products.length > visibleProducts.length;

  const useWelcomeTitle = onDark && !storeTheme?.enabled;

  return (
    <section className="scroll-mt-28">
      <div
        className={`flex items-center justify-between gap-3 mb-3 ${
          useWelcomeTitle
            ? 'welcome-card-glow welcome-card-border-glow welcome-card-shimmer bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl px-3 py-2.5'
            : 'px-0.5'
        }`}
      >
        <h3
          className={`font-black text-sm sm:text-base flex items-center gap-2 min-w-0 ${
            onDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {useWelcomeTitle && (
            <span className="w-1.5 h-5 shrink-0 rounded-full bg-gradient-to-b from-[#B18CFF] to-[#7B3DFF] shadow-[0_0_10px_rgba(123,61,255,0.55)]" />
          )}
          <span className="truncate">{section.title}</span>
        </h3>
        {(hasMore || expanded) && section.products.length > 4 && (
          <button
            type="button"
            onClick={onToggleExpand}
            className={`flex items-center gap-0.5 text-xs sm:text-sm font-bold shrink-0 ${
              useWelcomeTitle
                ? 'welcome-btn-pulse text-white bg-white/10 border border-white/25 rounded-xl px-2.5 py-1 hover:bg-white/15'
                : onDark
                  ? 'text-[#E9DAFF] hover:underline'
                  : 'text-[#c41e3a] hover:underline'
            }`}
          >
            {expanded ? t('products.showLess') : t('products.showAll')}
            {!expanded && <ChevronLeft size={16} className="rotate-180" />}
          </button>
        )}
      </div>

      {expanded ? (
        <VirtualizedGrid
          items={section.products}
          estimateRowHeight={260}
          overscan={2}
          gridClassName="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 gap-3"
          getItemKey={(product) => product.id}
          renderItem={(product, index) => (
            <StoreProductCard
              layout="grid"
              product={product}
              storeName={getStoreName(product)}
              storeUsername={getStoreUsername?.(product)}
              storeVerified={getStoreVerified?.(product) ?? false}
              storeTheme={storeTheme}
              priority={index < 6}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              onShareProduct={onShareProduct}
              onStoreClick={onStoreClick}
              showStoreName={showStoreName}
            />
          )}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
          {visibleProducts.map((product, index) => (
            <StoreProductCard
              key={product.id}
              product={product}
              storeName={getStoreName(product)}
              storeUsername={getStoreUsername?.(product)}
              storeVerified={getStoreVerified?.(product) ?? false}
              storeTheme={storeTheme}
              priority={index < 4}
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
  getStoreUsername,
  getStoreVerified,
  storeCategoryId,
  variant = 'onDark',
  emptyTitle,
  emptySubtitle,
  storeTheme,
  onProductClick,
  onAddToCart,
  onShareProduct,
  onStoreClick,
  showStoreName = true,
}) => {
  const { t } = useTranslation();
  const onDark = variant === 'onDark';
  const resolvedEmptyTitle = emptyTitle ?? t('products.emptyStoreTitle');
  const resolvedEmptySubtitle = emptySubtitle ?? t('products.emptyStoreSubtitle');
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
            : 'welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md'
        }`}
        style={theme.enabled ? emptyPanel.style : undefined}
      >
        <p
          className={`font-black text-lg mb-2 ${theme.enabled ? '' : 'text-white'}`}
          style={theme.enabled ? themeFieldTextStyle(theme.fields.productCardTextColor) : undefined}
        >
          {resolvedEmptyTitle}
        </p>
        <p
          className={`text-xs font-bold ${theme.enabled ? '' : 'text-white/70'}`}
          style={
            theme.enabled
              ? { ...themeFieldTextStyle(theme.fields.productCardTextColor), opacity: 0.7 }
              : undefined
          }
        >
          {resolvedEmptySubtitle}
        </p>
      </div>
    ) : (
      <div className="py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm px-8">
        <p className="text-violet font-black text-lg mb-2">{resolvedEmptyTitle}</p>
        <p className="text-slate-400 text-xs font-bold">{resolvedEmptySubtitle}</p>
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
          getStoreUsername={getStoreUsername}
          getStoreVerified={getStoreVerified}
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
