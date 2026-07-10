import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, X } from 'lucide-react';

const MODAL_Z_INDEX = 10050;

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

interface LegalSheetModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const LegalSheetModal: React.FC<LegalSheetModalProps> = ({
  open,
  onClose,
  title,
  icon: Icon,
  children,
}) => {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col bg-mahalak-gradient text-white"
      style={{ zIndex: MODAL_Z_INDEX }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 border-b border-white/10 bg-[#0B1320]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-vibrant-purple text-white font-black text-xs hover:bg-violet transition-colors shrink-0"
        >
          <ChevronRight size={16} />
          رجوع للتطبيق
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div className="p-2 bg-violet/20 text-violet rounded-xl shrink-0">
            <Icon size={18} />
          </div>
          <h2 className="font-black text-white text-sm truncate">{title}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-all shrink-0"
          aria-label="إغلاق"
        >
          <X size={18} className="text-slate-300" />
        </button>
      </header>

      <main
        className="flex-1 h-0 overflow-y-scroll overflow-x-hidden overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-5 pb-12">
          {children}
        </div>
      </main>
    </div>,
    document.body,
  );
};
