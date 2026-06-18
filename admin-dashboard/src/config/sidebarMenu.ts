import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  CreditCard,
  Map,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Store as StoreIcon,
  Ticket,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { AdminPanelTab, PageKey } from '../lib/permissions';

export interface SidebarMenuItem {
  pageKey: PageKey;
  tab: AdminPanelTab;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
}

/** Ordered sidebar entries — visibility filtered at runtime via usePermission(pageKey). */
export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  { pageKey: 'overview', tab: 'overview', label: 'نظرة عامة', icon: BarChart3 },
  { pageKey: 'stores', tab: 'stores', label: 'إدارة المتاجر', icon: StoreIcon },
  { pageKey: 'customers', tab: 'customers', label: 'إدارة الزبائن', icon: Users },
  { pageKey: 'orders', tab: 'orders', label: 'إدارة الطلبات', icon: ShoppingBag },
  { pageKey: 'products', tab: 'products', label: 'إدارة المنتجات', icon: Package },
  { pageKey: 'rechargeCodes', tab: 'recharge', label: 'شحن الكودات (توليد)', icon: Zap, iconClassName: 'text-emerald-400' },
  { pageKey: 'promoCodes', tab: 'promos', label: 'أكواد الخصم', icon: Ticket },
  { pageKey: 'subscriptions', tab: 'subscriptions', label: 'أسعار الاشتراكات', icon: CreditCard },
  { pageKey: 'payouts', tab: 'payouts', label: 'أرباح المتاجر (مستحقات)', icon: Wallet, iconClassName: 'text-emerald-400' },
  { pageKey: 'flashSales', tab: 'flashsales', label: 'الفعاليات المركزية', icon: Zap, iconClassName: 'text-yellow-400' },
  { pageKey: 'reviews', tab: 'reviews', label: 'تقييمات المتاجر', icon: Star },
  { pageKey: 'broadcast', tab: 'broadcast', label: 'إرسال إشعارات', icon: Bell },
  { pageKey: 'whatsapp', tab: 'whatsapp', label: 'حملات الواتساب', icon: MessageCircle, iconClassName: 'text-green-500' },
  { pageKey: 'heatmap', tab: 'heatmap', label: 'الخريطة الحرارية للطلبات', icon: Map },
  { pageKey: 'database', tab: 'database', label: 'قاعدة البيانات', icon: Archive, iconClassName: 'text-amber-400' },
  { pageKey: 'ads', tab: 'ads', label: 'الإعلانات الممولة', icon: Megaphone, iconClassName: 'text-pink-400' },
  { pageKey: 'adminManagement', tab: 'adminManagement', label: 'إدارة المدراء (Admins)', icon: Shield },
  { pageKey: 'activityLogs', tab: 'activityLogs', label: 'سجل النشاط', icon: Activity },
  { pageKey: 'settings', tab: 'settings', label: 'إعدادات النظام', icon: Settings },
];
