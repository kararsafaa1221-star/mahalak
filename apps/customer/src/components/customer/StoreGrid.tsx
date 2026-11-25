import React, { memo } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { MahalakLogo } from '@shared/components/MahalakLogo';
import { ProductImage } from '@shared/components/ProductImage';
import { Store } from '@shared/types';
import { getStoreCategoryLabel } from '@shared/constants';
import { StoreIdentity } from '@shared/components/StoreIdentity';
import { OfferPercentBadge } from '@shared/components/OfferPercentBadge';
import { formatStoreUsername } from '@shared/utils/storeIdentity';
import { isStoreVerified } from '@shared/utils/storeVerification';

interface StoreGridItemProps {
  store: Store;
  offerBadge?: string | null;
  isVerified?: boolean;
  isFeatured?: boolean;
  distanceLabel?: string | null;
  ratingLabel?: string;
  onSelect: (store: Store) => void;
  variant?: 'default' | 'onDark';
  priority?: boolean;
}

const StoreGridItem = memo(function StoreGridItem({
  store,
  offerBadge,
  isVerified,
  isFeatured,
  distanceLabel,
  ratingLabel,
  onSelect,
  variant = 'default',
  priority = false,
}: StoreGridItemProps) {
  const categoryLabel = getStoreCategoryLabel(store.category);
  const rating = ratingLabel ?? Number(store.rating || 0).toFixed(1);
  const onDark = variant === 'onDark';

  return (
    <button
      type="button"
      onClick={() => onSelect(store)}
      className="group flex w-full flex-col items-center gap-2 rounded-xl p-1 text-center transition-all duration-200 hover:scale-[1.04] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-purple/50 cursor-pointer"
      aria-label={`${store.shopName}${formatStoreUsername(store.username) ? ` ${formatStoreUsername(store.username)}` : ''} — ${store.province} — ${categoryLabel}`}
    >
      <div className={`relative flex aspect-square w-full max-w-[76px] items-center justify-center overflow-hidden rounded-xl shadow-sm transition-shadow sm:max-w-[84px] ${
        isVerified
          ? onDark
            ? 'welcome-card-border-glow border-2 border-sky-300/70 bg-sky-500/15 backdrop-blur-md ring-2 ring-sky-400/30 group-hover:border-sky-200 group-hover:bg-sky-500/20'
            : 'border-2 border-sky-400/60 bg-white ring-2 ring-sky-300/40 group-hover:border-sky-500 group-hover:shadow-md group-hover:shadow-sky-200/50'
          : onDark
            ? 'welcome-card-border-glow border border-white/30 bg-white/10 backdrop-blur-md group-hover:border-white/50 group-hover:bg-white/15'
            : 'border border-slate-200 bg-white group-hover:border-vibrant-purple/30 group-hover:shadow-md'
      }`}>
        {store.logo ? (
          <ProductImage
            src={store.logo}
            alt={store.shopName}
            size="custom"
            priority={priority}
            variant={onDark ? 'dark' : 'light'}
            className="h-full w-full rounded-xl"
            imageClassName="transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MahalakLogo className="h-14 w-14 object-contain opacity-40" />
          </div>
        )}

        {offerBadge && (
          <OfferPercentBadge label={offerBadge} variant="pill" size="md" placement="card" />
        )}

        {distanceLabel && (
          <div className="absolute top-1 right-1 z-10 rounded-md border border-white/30 bg-vibrant-purple/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm">
            <span className="text-[7px] font-black leading-none text-white sm:text-[8px]">{distanceLabel}</span>
          </div>
        )}

        {isFeatured && (
          <div
            className={`absolute top-1 z-10 rounded-md bg-gradient-to-tr from-amber-400 to-amber-500 p-1 text-white shadow-sm ${
              distanceLabel ? 'left-1' : 'right-1'
            }`}
            title="متجر مميز"
          >
            <Zap size={10} fill="currentColor" />
          </div>
        )}

      </div>

      <div className="flex w-full flex-col items-center justify-center gap-0.5 px-0.5">
        <StoreIdentity
          name={store.shopName}
          username={store.username}
          verified={!!isVerified}
          size="xs"
          align="center"
          nameClassName={
            onDark
              ? 'text-white group-hover:text-white/90 line-clamp-2'
              : 'text-slate-800 group-hover:text-vibrant-purple line-clamp-2'
          }
          usernameClassName={onDark ? 'text-white/75' : 'text-vibrant-purple/80'}
        />
        <div className={`flex items-center gap-0.5 rounded-md px-1.5 py-[2px] ${
          onDark
            ? 'border border-amber-300/30 bg-amber-400/15 text-amber-200'
            : 'border border-amber-100/30 bg-amber-50 text-amber-500'
        }`}>
          <Sparkles size={9} className={`fill-amber-400 ${onDark ? 'text-amber-300' : 'text-amber-500'}`} />
          <span className="text-[9px] font-bold sm:text-[9.5px]">{rating}</span>
        </div>
        <span
          className={`line-clamp-1 w-full text-[8px] font-medium sm:text-[9px] ${
            onDark ? 'text-white/70' : 'text-slate-400'
          }`}
          title={store.province}
        >
          📍 {store.province}
        </span>
        <span
          className={`line-clamp-1 w-full rounded-full px-2 py-0.5 text-[7.5px] font-extrabold sm:text-[8px] ${
            onDark
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-vibrant-purple/5 text-vibrant-purple'
          }`}
          title={categoryLabel}
        >
          {categoryLabel}
        </span>
      </div>
    </button>
  );
});

export interface StoreGridProps {
  stores: Store[];
  onStoreSelect: (store: Store) => void;
  getOfferBadge?: (store: Store) => string | null;
  getStoreRating?: (store: Store) => string;
  getIsFeatured?: (store: Store) => boolean;
  getDistanceLabel?: (store: Store) => string | null;
  gridClassName?: string;
  className?: string;
  variant?: 'default' | 'onDark';
}

export const StoreGrid = memo(function StoreGrid({
  stores,
  onStoreSelect,
  getOfferBadge,
  getStoreRating,
  getIsFeatured,
  getDistanceLabel,
  gridClassName = 'grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4',
  className = '',
  variant = 'default',
}: StoreGridProps) {
  return (
    <div
      className={`grid w-full ${gridClassName} ${className}`}
      dir="rtl"
    >
      {stores.map((store, index) => (
        <StoreGridItem
          key={store.id}
          store={store}
          priority={index < 6}
          offerBadge={getOfferBadge?.(store) ?? null}
          ratingLabel={getStoreRating?.(store)}
          isFeatured={getIsFeatured?.(store) ?? false}
          distanceLabel={getDistanceLabel?.(store) ?? null}
          isVerified={isStoreVerified(store)}
          onSelect={onStoreSelect}
          variant={variant}
        />
      ))}
    </div>
  );
});

export { StoreGridItem };
