import React from 'react';
import { Percent } from 'lucide-react';

export type OfferPercentBadgeProps = {
  label: string;
  /** pill = floating bubble; ribbon = diagonal sash (legacy square cards) */
  variant?: 'pill' | 'ribbon';
  size?: 'sm' | 'md' | 'lg';
  /** Soft pulse / scale for the active carousel item */
  emphasize?: boolean;
  /**
   * Positioning preset:
   * - avatar: circular store logos (offers carousel)
   * - card: square product/store images
   * - inline: no absolute positioning (parent places it)
   */
  placement?: 'avatar' | 'card' | 'inline';
  className?: string;
};

/** Build a badge label from a product discount (e.g. "40%" or fallback text). */
export function formatProductOfferBadgeLabel(
  product: { discountType?: string; discountValue?: number } | null | undefined,
  fallbackLabel = 'خصم',
): string | null {
  if (!product || !product.discountType || product.discountType === 'none') return null;
  if (product.discountType === 'percent' && Number(product.discountValue) > 0) {
    return `${Math.round(Number(product.discountValue))}%`;
  }
  if (product.discountType === 'amount' && Number(product.discountValue) > 0) {
    return fallbackLabel;
  }
  return fallbackLabel;
}

/**
 * Unified red discount badge — used on offers carousel, store cards, and products.
 */
export function OfferPercentBadge({
  label,
  variant = 'pill',
  size = 'md',
  emphasize = false,
  placement = 'avatar',
  className = '',
}: OfferPercentBadgeProps) {
  const text = String(label || '').trim();
  if (!text) return null;

  const match = text.match(/^(\d+)\s*%?$/);
  const numeric = match ? match[1] : null;
  const display = numeric ?? text.replace(/%/g, '').trim();
  const isPercent = numeric != null;

  const redGradient = 'bg-gradient-to-br from-red-700 via-red-600 to-red-500';
  const redShadow = 'shadow-[0_4px_14px_rgba(220,38,38,0.55)]';

  if (variant === 'ribbon') {
    const ribbonPad =
      size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
    const ribbonText =
      size === 'lg' ? 'text-[9px]' : size === 'sm' ? 'text-[6.5px]' : 'text-[7.5px]';
    return (
      <div
        className={`pointer-events-none absolute left-0 top-0 z-20 overflow-hidden ${ribbonPad} ${className}`}
        aria-label={`خصم ${text}`}
      >
        <span
          className={`absolute -left-5 top-2.5 flex w-[5.25rem] -rotate-45 items-center justify-center gap-0.5 bg-gradient-to-r from-red-700 via-red-600 to-red-500 py-[3px] font-black leading-none text-white ${redShadow} ring-1 ring-white/50 ${ribbonText} ${
            emphasize ? 'animate-pulse' : ''
          }`}
        >
          {display}
          {isPercent && <span className="opacity-95">%</span>}
        </span>
      </div>
    );
  }

  const pad =
    size === 'lg'
      ? 'min-w-[2.15rem] px-1.5 py-1'
      : size === 'sm'
        ? 'min-w-[1.55rem] px-1 py-0.5'
        : 'min-w-[1.85rem] px-1.5 py-[3px]';
  const numSize =
    size === 'lg' ? 'text-[11px]' : size === 'sm' ? 'text-[8px]' : 'text-[9.5px]';
  const iconSize = size === 'lg' ? 9 : size === 'sm' ? 7 : 8;

  const wrapPos =
    placement === 'inline'
      ? 'relative z-20'
      : placement === 'card'
        ? 'pointer-events-none absolute top-1.5 right-1.5 z-20'
        : 'pointer-events-none absolute -top-1 -right-1 z-20';

  return (
    <div className={`${wrapPos} ${className}`} aria-label={`خصم ${text}`}>
      <div
        className={`relative flex items-center justify-center gap-px rounded-full ${redGradient} font-black text-white ${redShadow} ring-2 ring-white ${pad} ${
          emphasize ? 'scale-110' : ''
        }`}
      >
        <span
          className={`absolute inset-0 rounded-full bg-gradient-to-t from-black/25 to-white/20 ${
            emphasize ? 'animate-pulse' : ''
          }`}
          aria-hidden
        />
        {isPercent && (
          <Percent
            size={iconSize}
            strokeWidth={3}
            className="relative z-[1] shrink-0 opacity-95"
            aria-hidden
          />
        )}
        <span className={`relative z-[1] tabular-nums leading-none tracking-tight ${numSize}`}>
          {display}
        </span>
        {isPercent && (
          <span
            className={`relative z-[1] leading-none opacity-90 ${
              size === 'lg' ? 'text-[8px]' : size === 'sm' ? 'text-[6px]' : 'text-[7px]'
            }`}
          >
            %
          </span>
        )}
      </div>
    </div>
  );
}

export default OfferPercentBadge;
