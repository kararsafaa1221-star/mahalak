import React, { useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/useApp';
import { hasPermission, type AdminPanelTab } from '../lib/permissions';
import { SIDEBAR_MENU_ITEMS } from '../config/sidebarMenu';

interface AdminBottomNavProps {
  activeTab: AdminPanelTab;
  onSelect: (tab: AdminPanelTab) => void;
}

/** Desktop bottom quick-nav — pairs with the right sidebar on large screens. */
export const AdminBottomNav = React.memo(function AdminBottomNav({
  activeTab,
  onSelect,
}: AdminBottomNavProps) {
  const { currentAdminDoc } = useApp();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const visibleItems = useMemo(
    () => SIDEBAR_MENU_ITEMS.filter((item) => hasPermission(currentAdminDoc, item.pageKey)),
    [currentAdminDoc],
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeTab]);

  if (visibleItems.length === 0) return null;

  return (
    <nav
      className="admin-bottom-nav hidden lg:flex fixed bottom-0 left-0 right-72 z-[940] h-16 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(77,41,128,0.08)]"
      dir="rtl"
      aria-label="التنقل السريع"
    >
      <div
        ref={scrollerRef}
        className="flex h-full w-full items-stretch gap-0.5 overflow-x-auto px-2 py-1.5 scrollbar-thin"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.pageKey}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(item.tab)}
              title={item.label}
              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 transition ${
                isActive
                  ? 'bg-[#9952FF] text-white shadow-md shadow-[#e9daff]'
                  : 'text-slate-500 hover:bg-[#f5eeff] hover:text-[#4D2980]'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[9px] font-black leading-none whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
