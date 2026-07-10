import React from 'react';

export const MAHALAK_LOGO_SRC = '/mahalak-logo.png';

export const MahalakLogo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({
  className = 'h-8 w-8 object-contain',
  alt = 'محلك',
  src = MAHALAK_LOGO_SRC,
  ...props
}) => (
  <img src={src} alt={alt} className={className} {...props} />
);

/** Drop-in replacement for lucide icons that accept `size` and `className`. */
export const MahalakLogoIcon: React.FC<{ size?: number; className?: string; inverted?: boolean }> = ({
  size = 20,
  className = '',
  inverted = false,
}) => (
  <MahalakLogo
    alt=""
    aria-hidden
    className={`object-contain shrink-0 transition-[filter] duration-300 ${inverted ? 'brightness-0 invert' : ''} ${className}`}
    style={{ width: size, height: size, minWidth: size, minHeight: size }}
  />
);
