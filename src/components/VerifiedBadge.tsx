import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      style={{ minWidth: size, minHeight: size }}
    >
      {/* Scalloped badge border background in premium bright blue */}
      <path
        fill="#1d9bf0"
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.75 2.58 13.5 1.75 12 1.75s-2.75.83-3.422 2.03c-.408-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.672 1.2 1.922 2.03 3.422 2.03s2.75-.83 3.422-2.03c.408.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
      />
      {/* White centered check mark */}
      <path
        fill="#ffffff"
        d="M9.86 15.14l-3.3-3.3a.9.9 0 011.27-1.27l2.03 2.03 5.4-5.4a.9.9 0 011.27 1.27l-6.03 6.03a.9.9 0 01-1.27-.03z"
      />
    </svg>
  );
};

export default VerifiedBadge;
