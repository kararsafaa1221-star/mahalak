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
    pendingStores: number;
    expiredSubscriptions: number;
    pendingFlashSaleRequests: number;
    blockedAccountsCount: number;
    activeRechargeCodes: number;
    adsCount: number;
    adminStaffCount: number;
  };
}

/** Neutral counter pill — total/informational numbers (always shown when > 0). */
function counterBadge(value: number) {
  return value > 0 ? (
    <span className="mr-auto bg-slate-700 text-xs px-2 py-0.5 rounded-full">{value}</span>
  ) : null;
}

/** Urgent pill — needs admin action (pending approvals, expirations...). */
function urgentBadge(value: number) {
  return value > 0 ? (
    <span className="mr-auto bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
      {value}
    </span>
  ) : null;
}

function renderBadge(item: SidebarMenuItem, stats: AdminSidebarProps['stats']) {
  switch (item.pageKey) {
    case 'stores':
      return urgentBadge(stats.pendingStores);
    case 'subscriptions':
      return urgentBadge(stats.expiredSubscriptions);
    case 'customers':
      return counterBadge(stats.totalCustomers);
    case 'blockedAccounts':
      return counterBadge(stats.blockedAccountsCount);
    case 'orders':
      return urgentBadge(stats.pendingOrders);
    case 'products':
      return counterBadge(stats.totalProducts);
    case 'rechargeCodes':
      return counterBadge(stats.activeRechargeCodes);
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
    case 'flashSales':
      return urgentBadge(stats.pendingFlashSaleRequests);
    case 'reviews':
      return stats.unreadReviews > 0 ? (
        <span className="mr-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-bounce">
          جديد ({stats.unreadReviews})
        </span>
      ) : null;
    case 'ads':
      return counterBadge(stats.adsCount);
    case 'adminManagement':
      return counterBadge(stats.adminStaffCount);
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

  let lastSection: string | null = null;

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.tab;
        const badge = renderBadge(item, stats);
        const showSectionHeader = item.section !== lastSection;
        lastSection = item.section;

        return (
          <React.Fragment key={item.pageKey}>
            {showSectionHeader && (
              <div
                className={`px-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 ${
                  item.section === 'الرئيسية' ? '' : 'mt-3 pt-2 border-t border-white/10'
                }`}
              >
                {item.section}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelect(item.tab)}
              className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-2.5 rounded-xl transition text-sm ${
                isActive
                  ? 'bg-[#9952FF] text-white shadow-md'
                  : 'text-slate-400 hover:bg-[#9952FF]/50'
              } ${item.pageKey === 'adminManagement' && isActive ? 'border border-white/20' : ''}`}
            >
              <Icon size={18} />
              <span className={`font-semibold ${item.pageKey === 'payouts' ? 'flex-1 text-right' : ''}`}>
                {item.label}
              </span>
              {badge}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
});
