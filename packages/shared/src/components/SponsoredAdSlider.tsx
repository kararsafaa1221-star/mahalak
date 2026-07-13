import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  getSponsoredAdBadge,
  getSponsoredAdDesc,
  getSponsoredAdTitle,
  getSponsoredAdsFingerprint,
  isSponsoredAdClickable,
} from '../utils/sponsoredAds';

export interface SponsoredAdItem {
  id: string;
  url?: string;
  title?: string;
  desc?: string;
  link?: string;
  targetType?: string;
  targetId?: string;
  storeId?: string;
  targetStoreId?: string;
  targetTitle?: string;
  /** شارة مخصصة لهذا الإعلان (تتجاوز الإعداد العام) */
  badge?: string;
}

export interface SponsoredAdSliderProps {
  ads: SponsoredAdItem[];
  adInterval?: number;
  onAdClick?: (ad: SponsoredAdItem) => void;
  className?: string;
  /** full = شريط رئيسي (زبون)، compact = داخل بطاقة (تاجر) */
  size?: 'full' | 'compact';
  defaultTitle?: string;
  defaultDesc?: string;
  /** نص الشارة العلوية — من لوحة الإدارة. اتركه فارغاً لإخفائها. */
  badgeLabel?: string;
}

export function SponsoredAdSlider({
  ads,
  adInterval = 5,
  onAdClick,
  className = '',
  size = 'full',
  defaultTitle = 'اكتشف أفضل العروض في منطقتك!',
  defaultDesc = 'تسوّق الآن مع محلك',
  badgeLabel = 'إعلان مميز ممول ✨',
}: SponsoredAdSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [autoFlipSeed, setAutoFlipSeed] = useState(0);
  const adsFingerprint = getSponsoredAdsFingerprint(ads);

  const restartAutoFlip = useCallback(() => {
    setAutoFlipSeed((prev) => prev + 1);
  }, []);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    restartAutoFlip();
  }, [restartAutoFlip]);

  const nextAd = useCallback(() => {
    if (ads.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % ads.length);
    restartAutoFlip();
  }, [ads.length, restartAutoFlip]);

  const prevAd = useCallback(() => {
    if (ads.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    restartAutoFlip();
  }, [ads.length, restartAutoFlip]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, Math.max(1, adInterval) * 1000);
    return () => clearInterval(interval);
  }, [ads.length, adInterval, autoFlipSeed]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [adsFingerprint]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextAd();
    if (distance < -50) prevAd();
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (ads.length === 0) return null;

  const sizeClass = size === 'full' ? 'sponsored-ad-slider--full' : 'sponsored-ad-slider--compact';
  const slideEntries = ads.map((ad, idx) => ({ ad, idx }));
  const stackedSlides = [
    ...slideEntries.filter((entry) => entry.idx !== currentIndex),
    slideEntries[currentIndex],
  ];

  return (
    <div
      className={`sponsored-ad-slider ${sizeClass} rounded-[2rem] shadow-2xl border-2 border-vibrant-purple/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 group hover:shadow-2xl hover:shadow-vibrant-purple/25/10 transition-all duration-300 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {stackedSlides.map(({ ad, idx }) => {
        const isActive = idx === currentIndex;
        const isClickable = Boolean(onAdClick) && isSponsoredAdClickable(ad);
        const title = getSponsoredAdTitle(ad, defaultTitle);
        const desc = getSponsoredAdDesc(ad, defaultDesc);
        const slideBadge = getSponsoredAdBadge(ad, badgeLabel);
        return (
        <div
          key={`${ad.id ?? 'ad'}-${idx}`}
          onClick={() => {
            if (!isClickable) return;
            onAdClick?.(ad);
          }}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${isClickable ? 'cursor-pointer' : ''} ${isActive ? 'opacity-100 scale-100 pointer-events-auto z-10' : 'opacity-0 scale-95 pointer-events-none z-0'}`}
          aria-hidden={!isActive}
        >
          <img
            key={ad.url || `slide-${idx}`}
            src={ad.url || undefined}
            className="w-full h-full object-cover transition-transform duration-[8s] ease-out group-hover:scale-110 filter brightness-[0.85] contrast-[1.05]"
            alt={title || 'إعلان ممول'}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/10 flex flex-col justify-end p-2.5 sm:p-3.5 md:p-4">
            <div className="sponsored-ad-slider__copy flex flex-col text-right">
            {slideBadge && (
              <span className="sponsored-ad-slider__badge inline-flex items-center gap-1 font-bold tracking-wide shrink-0 rounded-full select-none">
                <span className="sponsored-ad-slider__badge-icon" aria-hidden="true">
                  <Sparkles size={7} className="stroke-[2.5]" />
                </span>
                <span className="sponsored-ad-slider__badge-text">{slideBadge}</span>
              </span>
            )}
            {title && (
              <h3
                key={isActive ? `title-${currentIndex}` : `title-idle-${idx}`}
                className="sponsored-ad-slider__title font-black leading-tight tracking-tight"
              >
                {title}
              </h3>
            )}
            {desc && (
              <p
                key={isActive ? `desc-${currentIndex}` : `desc-idle-${idx}`}
                className="sponsored-ad-slider__desc font-medium leading-snug line-clamp-2"
              >
                {desc}
              </p>
            )}
            </div>
          </div>
        </div>
        );
      })}

      {ads.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevAd();
            }}
            className="sponsored-ad-slider__nav sponsored-ad-slider__nav--prev w-9 h-9 sm:w-11 sm:h-11 bg-black/20 hover:bg-vibrant-purple text-white hover:scale-105 backdrop-blur-md rounded-full transition-all duration-300 flex items-center justify-center border border-white/20 shadow-lg cursor-pointer md:opacity-0 md:group-hover:opacity-100"
            aria-label="السابق"
          >
            <ChevronRight size={20} className="stroke-[3] sm:w-[22px] sm:h-[22px]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextAd();
            }}
            className="sponsored-ad-slider__nav sponsored-ad-slider__nav--next w-9 h-9 sm:w-11 sm:h-11 bg-black/20 hover:bg-vibrant-purple text-white hover:scale-105 backdrop-blur-md rounded-full transition-all duration-300 flex items-center justify-center border border-white/20 shadow-lg cursor-pointer md:opacity-0 md:group-hover:opacity-100"
            aria-label="التالي"
          >
            <ChevronLeft size={20} className="stroke-[3] sm:w-[22px] sm:h-[22px]" />
          </button>
        </>
      )}

      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 space-x-reverse z-20 bg-deep-navy/50 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10">
        {ads.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToIndex(idx);
            }}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === currentIndex ? 'w-6 bg-vibrant-purple' : 'w-2 bg-white/50 hover:bg-white'}`}
            aria-label={`شريحة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
