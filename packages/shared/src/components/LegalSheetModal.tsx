import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, X } from 'lucide-react';
import { WelcomeScreenBackground } from './WelcomeScreenBackground';

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
  variant?: 'default' | 'home';
}

export const LegalSheetModal: React.FC<LegalSheetModalProps> = ({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  variant = 'default',
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

  const isHome = variant === 'home';

  return createPortal(
    <div
      className={`fixed inset-0 flex flex-col text-white ${isHome ? 'bg-deep-navy' : 'bg-mahalak-gradient'}`}
      style={{ zIndex: MODAL_Z_INDEX }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {isHome && <WelcomeScreenBackground lite />}

      <header
        className={`shrink-0 relative z-10 flex items-center justify-between gap-3 px-4 py-4 border-b ${
          isHome
            ? 'border-white/10 bg-[#0B1320]/80 backdrop-blur-md shadow-sm'
            : 'border-white/10 bg-[#0B1320]/95 backdrop-blur-sm'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-xs transition-all shrink-0 active:scale-95 ${
            isHome
              ? 'welcome-btn-pulse text-white border border-white/30 shadow-brand-glow hover:opacity-95'
              : 'bg-vibrant-purple text-white hover:bg-violet'
          }`}
        >
          <ChevronRight size={16} />
          رجوع للتطبيق
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isHome
                ? 'bg-white/15 border border-white/20 text-white'
                : 'bg-violet/20 text-violet'
            }`}
          >
            <Icon size={18} />
          </div>
          <h2 className="font-black text-white text-sm truncate font-tajawal">{title}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-all shrink-0 active:scale-95"
          aria-label="إغلاق"
        >
          <X size={18} className="text-slate-300" />
        </button>
      </header>

      <main
        className="relative z-10 flex-1 h-0 overflow-y-scroll overflow-x-hidden overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className={`max-w-2xl mx-auto px-4 py-5 pb-12 ${isHome ? 'animate-fade-in' : ''}`}>
          {children}
        </div>
      </main>
    </div>,
    document.body,
  );
};
