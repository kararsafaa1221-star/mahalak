import React from 'react';
import { formatStoreUsername } from '../utils/storeIdentity';
import { VerifiedBadge } from './VerifiedBadge';

export type StoreIdentitySize = 'xs' | 'sm' | 'md' | 'lg';

const NAME_SIZE: Record<StoreIdentitySize, string> = {
  xs: 'text-[10px] sm:text-[11px] font-bold leading-tight',
  sm: 'text-xs font-black leading-tight',
  md: 'text-sm font-black leading-tight',
  lg: 'text-base sm:text-lg font-black leading-tight',
};

const USER_SIZE: Record<StoreIdentitySize, string> = {
  xs: 'text-[8px] sm:text-[9px] font-bold tracking-wide',
  sm: 'text-[10px] font-bold tracking-wide',
  md: 'text-[11px] font-bold tracking-wide',
  lg: 'text-xs font-black tracking-wide',
};

const VERIFIED_BADGE_SIZE: Record<StoreIdentitySize, number> = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
};

export type StoreIdentityProps = {
  name: string;
  username?: string | null;
  size?: StoreIdentitySize;
  align?: 'start' | 'center' | 'end';
  className?: string;
  nameClassName?: string;
  usernameClassName?: string;
  nameStyle?: React.CSSProperties;
  usernameStyle?: React.CSSProperties;
  /** When false, only the display name is shown. */
  showUsername?: boolean;
  /** Show the blue verified checkmark next to the store name. */
  verified?: boolean;
  nameAs?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
};

/**
 * Primary store branding: shop name with @username directly underneath.
 * Use across customer + merchant whenever a store is identified.
 */
export function StoreIdentity({
  name,
  username,
  size = 'md',
  align = 'start',
  className = '',
  nameClassName = '',
  usernameClassName = '',
  nameStyle,
  usernameStyle,
  showUsername = true,
  verified = false,
  nameAs = 'span',
}: StoreIdentityProps) {
  const handle = formatStoreUsername(username);
  const alignClass =
    align === 'center' ? 'items-center text-center' : align === 'end' ? 'items-end text-left' : 'items-start text-right';
  const NameTag = nameAs;
  const nameRowAlign =
    align === 'center' ? 'justify-center' : align === 'end' ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${alignClass} ${className}`}>
      <div className={`flex items-center gap-1 min-w-0 max-w-full ${nameRowAlign}`}>
        <NameTag
          className={`truncate min-w-0 ${NAME_SIZE[size]} ${nameClassName}`}
          style={nameStyle}
          title={name}
        >
          {name}
        </NameTag>
        {verified && (
          <VerifiedBadge size={VERIFIED_BADGE_SIZE[size]} className="shrink-0" />
        )}
      </div>
      {showUsername && handle ? (
        <span
          className={`truncate max-w-full ${USER_SIZE[size]} ${usernameClassName || 'opacity-80'}`}
          style={usernameStyle}
          title={handle}
          dir="ltr"
        >
          {handle}
        </span>
      ) : null}
    </div>
  );
}
