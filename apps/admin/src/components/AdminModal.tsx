import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Inner panel classes (default: large scrollable admin dialog). */
  panelClassName?: string;
  zIndexClass?: string;
}

/**
 * Full-screen admin dialog rendered on document.body so position:fixed
 * is not clipped by .admin-tab-content (content-visibility) ancestors.
 */
export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  children,
  panelClassName = 'bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col',
  zIndexClass = 'z-[1100]',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${zIndexClass} flex items-center justify-center p-4`}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};
