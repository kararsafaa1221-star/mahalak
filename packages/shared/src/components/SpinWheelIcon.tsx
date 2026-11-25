import { forwardRef, type SVGProps } from 'react';

export type SpinWheelIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/**
 * Circular lucky-wheel icon for عجلة الحظ (Lucide-compatible API).
 */
export const SpinWheelIcon = forwardRef<SVGSVGElement, SpinWheelIconProps>(
  ({ size = 24, className, strokeWidth = 2, color = 'currentColor', ...props }, ref) => {
    const s = typeof size === 'number' ? size : Number.parseInt(String(size), 10) || 24;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 5v8" />
        <path d="m12 13 6.928-4" />
        <path d="m12 13 6.928 4" />
        <path d="M12 13v8" />
        <path d="m12 13-6.928 4" />
        <path d="m12 13-6.928-4" />
        <circle cx="12" cy="13" r="2" />
        <path d="M12 1.75 10.2 4.6h3.6L12 1.75z" fill="currentColor" stroke="none" />
      </svg>
    );
  },
);

SpinWheelIcon.displayName = 'SpinWheelIcon';
