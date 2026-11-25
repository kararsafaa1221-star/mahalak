import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Archive,
  Award,
  BarChart3,
  Bell,
  Calculator,
  CreditCard,
  Gift,
  Map,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  Shield,
  ShieldBan,
  ShoppingBag,
  Star,
  Store as StoreIcon,
  Ticket,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { SpinWheelIcon } from '@shared/components/SpinWheelIcon';
import type { AdminPanelTab, PageKey } from '../lib/permissions';

export interface SidebarMenuItem {
  pageKey: PageKey;
  tab: AdminPanelTab;
  label: string;
  /** Compact label for the desktop bottom navigation bar. */
  shortLabel: string;
  icon: LucideIcon;
  /** Section this item belongs to — used to render group headers/dividers in the sidebar. */
  section: string;
}

/**
 * Ordered sidebar entries, grouped into sections so related pages sit one under
 * the other. Icons intentionally share one neutral color scheme (no per-item
 * custom colors) so the whole list reads as a single, unified set — active/hover
 * state is what conveys color, not the icon itself.
 */
export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  // الرئيسية
  { pageKey: 'overview', tab: 'overview', label: 'نظرة عامة', shortLabel: 'عامة', icon: BarChart3, section: 'الرئيسية' },

  // إدارة المتاجر
  { pageKey: 'stores', tab: 'stores', label: 'إدارة المتاجر', shortLabel: 'المتاجر', icon: StoreIcon, section: 'إدارة المتاجر' },
  { pageKey: 'subscriptions', tab: 'subscriptions', label: 'الاشتراكات والتفعيل التلقائي', shortLabel: 'اشتراكات', icon: CreditCard, section: 'إدارة المتاجر' },
  { pageKey: 'reviews', tab: 'reviews', label: 'تقييمات المتاجر', shortLabel: 'تقييمات', icon: Star, section: 'إدارة المتاجر' },
  { pageKey: 'flashSales', tab: 'flashsales', label: 'الفعاليات المركزية', shortLabel: 'فعاليات', icon: Zap, section: 'إدارة المتاجر' },

  // إدارة الزبائن
  { pageKey: 'customers', tab: 'customers', label: 'إدارة الزبائن', shortLabel: 'الزبائن', icon: Users, section: 'إدارة الزبائن' },
  { pageKey: 'blockedAccounts', tab: 'blocked', label: 'الحسابات المحظورة', shortLabel: 'محظورة', icon: ShieldBan, section: 'إدارة الزبائن' },

  // الطلبات والمنتجات
  { pageKey: 'orders', tab: 'orders', label: 'إدارة الطلبات', shortLabel: 'طلبات', icon: ShoppingBag, section: 'الطلبات والمنتجات' },
  { pageKey: 'products', tab: 'products', label: 'إدارة المنتجات', shortLabel: 'منتجات', icon: Package, section: 'الطلبات والمنتجات' },
  { pageKey: 'heatmap', tab: 'heatmap', label: 'الخريطة الحرارية للطلبات', shortLabel: 'خريطة', icon: Map, section: 'الطلبات والمنتجات' },

  // النقاط والعروض
  { pageKey: 'loyaltyWallet', tab: 'loyaltyWallet', label: 'محفظة النقاط والولاء', shortLabel: 'ولاء', icon: Award, section: 'النقاط والعروض' },
  { pageKey: 'spinWheel', tab: 'spinWheel', label: 'عجلة الحظ', shortLabel: 'عجلة', icon: SpinWheelIcon as LucideIcon, section: 'النقاط والعروض' },
  { pageKey: 'rechargeCodes', tab: 'recharge', label: 'شحن الكودات (توليد)', shortLabel: 'شحن', icon: Gift, section: 'النقاط والعروض' },
  { pageKey: 'promoCodes', tab: 'promos', label: 'أكواد الخصم', shortLabel: 'خصم', icon: Ticket, section: 'النقاط والعروض' },

  // المالية
  { pageKey: 'payouts', tab: 'payouts', label: 'أرباح المتاجر (مستحقات)', shortLabel: 'مستحقات', icon: Wallet, section: 'المالية' },
  { pageKey: 'accounts', tab: 'accounts', label: 'الحسابات', shortLabel: 'حسابات', icon: Calculator, section: 'المالية' },

  // التسويق والتواصل
  { pageKey: 'notificationTemplates', tab: 'notificationCenter', label: 'مركز الإشعارات', shortLabel: 'إشعارات', icon: Bell, section: 'التسويق والتواصل' },
  { pageKey: 'whatsapp', tab: 'whatsapp', label: 'حملات الواتساب', shortLabel: 'واتساب', icon: MessageCircle, section: 'التسويق والتواصل' },
  { pageKey: 'ads', tab: 'ads', label: 'الإعلانات الممولة', shortLabel: 'إعلانات', icon: Megaphone, section: 'التسويق والتواصل' },

  // النظام
  { pageKey: 'database', tab: 'database', label: 'قاعدة البيانات', shortLabel: 'قاعدة', icon: Archive, section: 'النظام' },
  { pageKey: 'adminManagement', tab: 'adminManagement', label: 'إدارة المدراء (Admins)', shortLabel: 'مدراء', icon: Shield, section: 'النظام' },
  { pageKey: 'activityLogs', tab: 'activityLogs', label: 'سجل النشاط', shortLabel: 'سجل', icon: Activity, section: 'النظام' },
  { pageKey: 'settings', tab: 'settings', label: 'إعدادات النظام', shortLabel: 'إعدادات', icon: Settings, section: 'النظام' },
];
