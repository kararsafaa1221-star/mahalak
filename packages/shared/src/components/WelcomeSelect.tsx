import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export type WelcomeSelectSize = 'sm' | 'md' | 'lg';

export interface WelcomeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
  showChevron?: boolean;
  size?: WelcomeSelectSize;
}

const sizeClasses: Record<WelcomeSelectSize, string> = {
  sm: 'welcome-select--sm',
  md: 'welcome-select--md',
  lg: 'welcome-select--lg',
};

export const WelcomeSelect = React.forwardRef<HTMLSelectElement, WelcomeSelectProps>(
  (
    {
      className,
      wrapperClassName,
      showChevron = true,
      size = 'md',
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectEl = (
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          'welcome-select',
          sizeClasses[size],
          showChevron && 'welcome-select--with-chevron',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );

    if (!showChevron) return selectEl;

    return (
      <div className={cn('welcome-select-wrap', wrapperClassName)}>
        {selectEl}
        <ChevronDown size={14} className="welcome-select-chevron" aria-hidden />
      </div>
    );
  },
);

WelcomeSelect.displayName = 'WelcomeSelect';
