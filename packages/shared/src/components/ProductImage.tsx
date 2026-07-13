import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isImageCached, markImageLoaded, prefetchImageUrl } from '@shared/utils/prefetchImages';

interface ProductImageProps {
  src?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'custom';
  /** تحميل فوري للصور الظاهرة أولاً */
  priority?: boolean;
  variant?: 'light' | 'dark';
  objectFit?: 'cover' | 'contain';
}

function resolveInitialLoading(src?: string): boolean {
  if (!src) return false;
  return !isImageCached(src);
}

const ProductImageInner: React.FC<ProductImageProps> = ({
  src,
  alt = 'صورة منتج',
  className = '',
  imageClassName = '',
  size = 'md',
  priority = false,
  variant = 'light',
  objectFit = 'cover',
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loading, setLoading] = useState(() => resolveInitialLoading(src));
  const [error, setError] = useState(!src);

  const sizeClasses = {
    sm: 'w-[100px] h-[100px] min-w-[100px] min-h-[100px] max-w-[100px] max-h-[100px]',
    md: 'w-[150px] h-[150px] min-w-[150px] min-h-[150px] max-w-[150px] max-h-[150px]',
    lg: 'w-[200px] h-[200px] min-w-[200px] min-h-[200px] max-w-[200px] max-h-[200px]',
    custom: 'w-full h-full',
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.custom;
  const isDark = variant === 'dark';
  const isCached = src ? isImageCached(src) : false;

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }
    if (isImageCached(src)) {
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);

    let cancelled = false;
    void prefetchImageUrl(src).then((ok) => {
      if (cancelled || !ok) return;
      setLoading(false);
      setError(false);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useLayoutEffect(() => {
    if (!src || isImageCached(src)) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalHeight > 0) {
      markImageLoaded(src);
      setLoading(false);
    }
  }, [src]);

  const showSpinner = loading && !error && !isCached;

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none shrink-0 ${selectedSizeClass} ${className}`}
      dir="rtl"
    >
      {showSpinner && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            isDark ? 'bg-white/5' : 'bg-slate-50'
          }`}
        >
          <div
            className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
              isDark ? 'border-[#fff700]/60' : 'border-violet-600'
            }`}
          />
        </div>
      )}

      {(error || !src) ? (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center p-2 text-center ${
            isDark
              ? 'bg-white/5 border border-white/10 text-white/40'
              : 'bg-slate-50 border border-slate-100 text-slate-400'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 opacity-40 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] font-black">لا توجد صورة</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...(priority ? { fetchPriority: 'high' as const } : {})}
          className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} ${
            showSpinner ? 'opacity-0' : 'opacity-100'
          } ${imageClassName}`}
          onLoad={() => {
            markImageLoaded(src);
            setLoading(false);
          }}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
};

export const ProductImage = memo(ProductImageInner);
