import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Percent, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Store } from '../types';
import { getStoreCategoryLabel } from '../constants';
import { MahalakLogo } from './MahalakLogo';
import { ProductImage } from './ProductImage';
import { VerifiedBadge } from './VerifiedBadge';
import { OfferPercentBadge } from './OfferPercentBadge';
import { isStoreVerified } from '../utils/storeVerification';

export type StoresCoverflowCarouselProps = {
  stores: Store[];
  intervalSec?: number;
  getRating?: (store: Store) => string;
  /** e.g. "60%" discount badge on the avatar */
  getOfferBadge?: (store: Store) => string | null | undefined;
  onStoreSelect?: (store: Store) => void;
  onViewAll?: () => void;
  className?: string;
  title?: string;
  /** Filter to verified stores only (default true for verified carousel). */
  verifiedOnly?: boolean;
  /** Header leading icon */
  headerIcon?: 'verified' | 'percent';
  /** Visual accent for borders / active dots */
  accent?: 'sky' | 'rose';
  /** i18n count key, default stores.verifiedCarouselCount */
  countKey?: string;
};

function storeAddressLine(store: Store): string {
  const parts = [store.area, store.province].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.join(' · ') || '—';
}

function circularDelta(i: number, center: number, n: number): number {
  if (n <= 0) return 0;
  let d = i - center;
  d = ((d % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

function sideCountForWidth(width: number): number {
  if (width < 380) return 1;
  if (width < 560) return 2;
  return 3;
}

const ACCENT = {
  sky: {
    border: 'border-sky-300/80 ring-sky-400/30',
    btn: 'border-sky-300/40 bg-sky-400/15 text-sky-100',
    count: 'text-sky-200/80',
    dot: 'bg-sky-300',
    focus: 'focus-visible:ring-sky-300/50',
  },
  rose: {
    border: 'border-rose-300/80 ring-rose-400/30',
    btn: 'border-rose-300/40 bg-rose-400/15 text-rose-100',
    count: 'text-rose-200/80',
    dot: 'bg-rose-300',
    focus: 'focus-visible:ring-rose-300/50',
  },
} as const;

function StoreCardContent({
  store,
  avatarSize,
  isCenter,
  rating,
  offerBadge,
  accentBorder,
  showVerifiedBadge,
}: {
  store: Store;
  avatarSize: number;
  isCenter: boolean;
  rating: string;
  offerBadge?: string | null;
  accentBorder: string;
  showVerifiedBadge: boolean;
}) {
  const category = getStoreCategoryLabel(store.category);
  const address = storeAddressLine(store);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="relative shrink-0" style={{ width: avatarSize, height: avatarSize }}>
        <div
          className={`h-full w-full overflow-hidden rounded-full bg-white/10 shadow-md ${
            isCenter ? `border-2 ring-2 ${accentBorder}` : 'border border-white/25'
          }`}
        >
          {store.logo ? (
            <ProductImage
              src={store.logo}
              alt={store.shopName}
              size="custom"
              variant="dark"
              className="h-full w-full rounded-full"
              objectFit="cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-vibrant-purple/40">
              <MahalakLogo className="h-[55%] w-[55%] object-contain opacity-70" />
            </div>
          )}
        </div>
        {offerBadge && (
          <OfferPercentBadge
            label={offerBadge}
            variant="pill"
            size={isCenter ? 'md' : 'sm'}
            emphasize={isCenter}
          />
        )}
        {showVerifiedBadge && (
          <div className="absolute -bottom-0.5 -left-0.5 drop-shadow-md" aria-hidden>
            <VerifiedBadge size={Math.max(11, Math.round(avatarSize * 0.22))} />
          </div>
        )}
      </div>

      <p
        className={`mt-1.5 w-full px-0.5 font-black leading-tight line-clamp-1 ${
          isCenter ? 'text-[12px] text-white' : 'text-[9px] text-white/80'
        }`}
      >
        {store.shopName}
      </p>
      <p
        className={`mt-0.5 flex w-full items-center justify-center gap-0.5 px-0.5 font-bold line-clamp-1 ${
          isCenter ? 'text-[9px] text-white/70' : 'text-[7px] text-white/55'
        }`}
      >
        <MapPin size={isCenter ? 9 : 7} className="shrink-0 text-sky-200/80" />
        <span className="truncate">{address}</span>
      </p>
      <div className="mt-1 flex w-full items-center justify-center gap-1 flex-wrap px-0.5">
        <span
          className={`max-w-[70%] truncate rounded-full border border-white/20 bg-white/10 font-extrabold text-white/90 ${
            isCenter ? 'px-2 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[6px]'
          }`}
        >
          {category}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full border border-amber-300/30 bg-amber-400/15 font-bold text-amber-100 ${
            isCenter ? 'px-2 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[6px]'
          }`}
        >
          <Sparkles
            size={isCenter ? 9 : 7}
            className="fill-amber-300 text-amber-200"
          />
          {rating}
        </span>
      </div>
    </div>
  );
}

/** Coverflow carousel for store discovery (verified, offers, …). */
export function StoresCoverflowCarousel({
  stores,
  intervalSec = 4,
  getRating,
  getOfferBadge,
  onStoreSelect,
  onViewAll,
  className = '',
  title,
  verifiedOnly = false,
  headerIcon = 'verified',
  accent = 'sky',
  countKey = 'stores.verifiedCarouselCount',
}: StoresCoverflowCarouselProps) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const theme = ACCENT[accent];
  const list = useMemo(() => {
    const base = stores.filter((s) => !s.isBanned);
    return verifiedOnly ? base.filter((s) => isStoreVerified(s)) : base;
  }, [stores, verifiedOnly]);
  const [index, setIndex] = useState(0);
  const [autoSeed, setAutoSeed] = useState(0);
  const [sideCount, setSideCount] = useState(1);
  const [stageWidth, setStageWidth] = useState(320);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const restart = useCallback(() => setAutoSeed((n) => n + 1), []);

  const goTo = useCallback(
    (nextIdx: number) => {
      if (list.length <= 0) return;
      setIndex(((nextIdx % list.length) + list.length) % list.length);
      restart();
    },
    [list.length, restart],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const listKey = useMemo(() => list.map((s) => s.id).join('|'), [list]);

  useEffect(() => {
    setIndex(0);
  }, [listKey]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      const w = typeof window !== 'undefined' ? window.innerWidth : 360;
      setStageWidth(w);
      setSideCount(sideCountForWidth(w));
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width || 320;
      setStageWidth(w);
      setSideCount(sideCountForWidth(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prevIdx) => (prevIdx + 1) % list.length);
    }, Math.max(2, intervalSec) * 1000);
    return () => window.clearInterval(timer);
  }, [list.length, intervalSec, autoSeed]);

  if (list.length === 0) return null;

  const safeIndex = Math.min(index, list.length - 1);
  const effectiveSides = Math.min(sideCount, Math.max(0, list.length - 1));
  const centerSize = Math.min(76, Math.max(60, Math.round(stageWidth * 0.2)));
  const sideAvatar = Math.round(centerSize * 0.7);
  const centerCardW = Math.min(140, Math.max(110, Math.round(stageWidth * 0.38)));
  const sideCardW = Math.min(100, Math.max(78, Math.round(centerCardW * 0.72)));
  const step = Math.round(centerCardW * 0.72 + 6);
  const stageHeight = centerSize + 72;
  const resolvedTitle = title || t('stores.verifiedCarouselTitle');

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (touchStart == null || touchEnd == null) return;
    const delta = touchStart - touchEnd;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) next();
    else prev();
  };

  return (
    <section
      className={`welcome-card-glow welcome-card-border-glow relative bg-white/5 border border-white/30 backdrop-blur-md rounded-[1.75rem] px-3 pt-3 pb-3.5 mx-1 shadow-lg overflow-hidden ${className}`}
      dir="rtl"
      aria-roledescription="carousel"
      aria-label={resolvedTitle}
    >
      <div className="flex items-center gap-1.5 min-w-0 px-1 mb-2">
        {headerIcon === 'percent' ? (
          <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-rose-500/80 text-white">
            <Percent size={9} strokeWidth={3} />
          </span>
        ) : (
          <VerifiedBadge size={15} className="shrink-0" />
        )}
        <h3 className="text-[11px] font-black text-white truncate">{resolvedTitle}</h3>
        {onViewAll && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewAll();
            }}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold active:scale-95 transition ${theme.btn}`}
          >
            {t('products.showAll')}
          </button>
        )}
        <span className={`text-[9px] font-bold shrink-0 ${theme.count}`}>
          {t(countKey, { count: list.length })}
        </span>
      </div>

      <div
        ref={stageRef}
        className="relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={next}
              className="absolute left-0 top-[38%] z-30 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 border border-white/25 text-white flex items-center justify-center active:scale-95 backdrop-blur-sm shadow-md"
              aria-label={t('ads.next')}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={prev}
              className="absolute right-0 top-[38%] z-30 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 border border-white/25 text-white flex items-center justify-center active:scale-95 backdrop-blur-sm shadow-md"
              aria-label={t('ads.prev')}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        <div className="relative mx-auto" style={{ height: stageHeight, minHeight: 150 }}>
          {list.map((store, i) => {
            const delta = circularDelta(i, safeIndex, list.length);
            const abs = Math.abs(delta);
            if (abs > effectiveSides) return null;

            const isCenter = delta === 0;
            const x = -delta * step;
            const avatarSize = isCenter
              ? centerSize
              : Math.max(40, Math.round(sideAvatar * (1 - (abs - 1) * 0.1)));
            const cardW = isCenter ? centerCardW : sideCardW;
            const opacity = isCenter ? 1 : Math.max(0.35, 0.58 - (abs - 1) * 0.1);
            const z = 20 - abs;
            const rating =
              getRating?.(store) ?? Number(store.rating || 0).toFixed(1);
            const offerBadge = getOfferBadge?.(store) || null;

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  if (isCenter) onStoreSelect?.(store);
                  else goTo(i);
                }}
                className={`absolute top-0 left-1/2 focus:outline-none focus-visible:ring-2 ${theme.focus} rounded-xl`}
                style={{
                  width: cardW,
                  marginLeft: -cardW / 2,
                  transform: `translateX(${x}px) scale(${isCenter ? 1 : 0.9})`,
                  opacity,
                  zIndex: z,
                  transition:
                    'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease, width 320ms ease',
                }}
                aria-label={store.shopName}
                aria-current={isCenter ? 'true' : undefined}
              >
                <StoreCardContent
                  store={store}
                  avatarSize={avatarSize}
                  isCenter={isCenter}
                  rating={rating}
                  offerBadge={offerBadge}
                  accentBorder={theme.border}
                  showVerifiedBadge={isStoreVerified(store)}
                />
              </button>
            );
          })}
        </div>
      </div>

      {list.length > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5" aria-hidden>
          {list.length <= 10 ? (
            list.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIndex ? `w-4 ${theme.dot}` : 'w-1.5 bg-white/25'
                }`}
              />
            ))
          ) : (
            <span className="text-[9px] font-extrabold text-white/55 tabular-nums">
              {safeIndex + 1} / {list.length}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/** @deprecated Prefer StoresCoverflowCarousel — kept for existing imports. */
export type VerifiedStoresCarouselProps = StoresCoverflowCarouselProps;

export function VerifiedStoresCarousel(props: VerifiedStoresCarouselProps) {
  return (
    <StoresCoverflowCarousel
      {...props}
      verifiedOnly={props.verifiedOnly ?? true}
      headerIcon={props.headerIcon ?? 'verified'}
      accent={props.accent ?? 'sky'}
      countKey={props.countKey ?? 'stores.verifiedCarouselCount'}
    />
  );
}

export default VerifiedStoresCarousel;
