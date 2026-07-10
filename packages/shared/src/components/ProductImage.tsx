import React, { useState } from 'react';

interface ProductImageProps {
  src?: string;
  alt?: string;
  className?: string; // Additional classes for the outer wrapper
  imageClassName?: string; // Additional classes for the image itself
  size?: 'sm' | 'md' | 'lg' | 'custom'; // Predefined sizes (e.g., 150x150) or aspect-square
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'صورة منتج',
  className = '',
  imageClassName = '',
  size = 'md'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Predefined exact aspect-ratio square frames preventing layout grid breakages
  const sizeClasses = {
    sm: 'w-[100px] h-[100px] min-w-[100px] min-h-[100px] max-w-[100px] max-h-[100px]',
    md: 'w-[150px] h-[150px] min-w-[150px] min-h-[150px] max-w-[150px] max-h-[150px]',
    lg: 'w-[200px] h-[200px] min-w-[200px] min-h-[200px] max-w-[200px] max-h-[200px]',
    custom: 'w-full h-full aspect-square'
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.custom;

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center select-none shrink-0 ${selectedSizeClass} ${className}`}
      dir="rtl"
    >
      {/* Skeleton screen loader */}
      {loading && !error && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Fallback view if image is missing/corrupted */}
      {(error || !src) ? (
        <div className="absolute inset-0 bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-2 text-center text-slate-400">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-8 h-8 opacity-40 mb-1 text-slate-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-black text-slate-400">لا توجد صورة</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-all duration-300 ${
            loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          } ${imageClassName}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </div>
  );
};
