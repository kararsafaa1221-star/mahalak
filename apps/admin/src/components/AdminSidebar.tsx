import React, { useMemo } from 'react';
import { useApp } from '../context/useApp';
import { hasPermission } from '../lib/permissions';
import { SIDEBAR_MENU_ITEMS, type SidebarMenuItem } from '../config/sidebarMenu';
import type { AdminPanelTab } from '../lib/permissions';

interface AdminSidebarProps {
  activeTab: AdminPanelTab;
  onSelect: (tab: AdminPanelTab) => void;
  stats: {
    totalCustomers: number;
    pendingOrders: number;
    totalProducts: number;
    activePromos: number;
    unreadReviews: number;
    pendingPayouts: number;
  };
}

function renderBadge(item: SidebarMenuItem, stats: AdminSidebarProps['stats']) {
  switch (item.pageKey) {
    case 'customers':
      return (
        <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{stats.totalCustomers}</span>
      );
    case 'orders':
      return stats.pendingOrders > 0 ? (
        <span className="mr-auto bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
          {stats.pendingOrders}
        </span>
      ) : null;
    case 'products':
      return (
        <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{stats.totalProducts}</span>
      );
    case 'promoCodes':
      return (
        <span className="mr-auto bg-green-600 text-xs px-2 py-0.5 rounded-full">{stats.activePromos}</span>
      );
    case 'payouts':
      return stats.pendingPayouts > 0 ? (
        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {stats.pendingPayouts}
        </span>
      ) : null;
    case 'reviews':
      return stats.unreadReviews > 0 ? (
        <span className="mr-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce">
          جديد ({stats.unreadReviews})
        </span>
      ) : null;
    case 'adminManagement':
      return null;
    default:
      return null;
  }
}

export const AdminSidebar = React.memo(function AdminSidebar({ activeTab, onSelect, stats }: AdminSidebarProps) {
  const { currentAdminDoc } = useApp();

  const visibleItems = useMemo(
    () => SIDEBAR_MENU_ITEMS.filter((item) => hasPermission(currentAdminDoc, item.pageKey)),
    [currentAdminDoc],
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.tab;
        const badge = renderBadge(item, stats);

        return (
          <button
            key={item.pageKey}
            type="button"
            onClick={() => onSelect(item.tab)}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
              isActive
                ? 'bg-[#9952FF] text-white shadow-md'
                : 'text-slate-400 hover:bg-[#9952FF]/50'
            } ${item.pageKey === 'adminManagement' && isActive ? 'border border-white/20' : ''}`}
          >
            <Icon size={18} className={item.iconClassName} />
            <span className={`font-semibold ${item.pageKey === 'payouts' ? 'flex-1 text-right' : ''}`}>
              {item.label}
            </span>
            {badge}
          </button>
        );
      })}
    </nav>
  );
});
