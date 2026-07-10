import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  open,
  onClose,
  children,
  zIndex = 10050,
}) => {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-deep-navy/70 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6"
      style={{ zIndex }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
