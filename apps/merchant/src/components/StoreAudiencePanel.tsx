import React, { memo, useMemo } from "react";
import {
  BellRing,
  ClipboardList,
  Gift,
  Search,
  Users,
} from "lucide-react";
import type { Customer, Order } from "@shared/types";
import { customerMatchesSearch } from "@shared/utils/customerId";
import { CopyButton } from "@shared/components/CopyButton";

export function getOrderedCustomerIds(storeId: string, orders: Order[]): string[] {
  return Array.from(
    new Set(
      orders
        .filter((o) => o.storeId === storeId)
        .map((o) => o.customerId)
        .filter(Boolean),
    ),
  ) as string[];
}

export function getStoreAudienceStats(
  storeId: string,
  customers: Customer[],
  orders: Order[],
) {
  const orderedCustomerIds = getOrderedCustomerIds(storeId, orders);
  const followers = customers.filter((c) =>
    (c.followedStores ?? []).includes(storeId),
  ).length;
  const notifications = customers.filter((c) =>
    (c.storeNotifications ?? []).includes(storeId),
  ).length;
  const pastBuyers = orderedCustomerIds.length;
  const total = customers.filter(
    (c) =>
      (c.followedStores ?? []).includes(storeId) ||
      (c.storeNotifications ?? []).includes(storeId) ||
      orderedCustomerIds.includes(c.id),
  ).length;

  return { followers, notifications, pastBuyers, total, orderedCustomerIds };
}

export function buildStoreAudienceList(
  storeId: string,
  customers: Customer[],
  orders: Order[],
  searchQuery: string,
  getCustomerSeqId: (id: string) => string,
): Customer[] {
  const { orderedCustomerIds } = getStoreAudienceStats(storeId, customers, orders);
  let audience = customers.filter(
    (c) =>
      (c.followedStores ?? []).includes(storeId) ||
      (c.storeNotifications ?? []).includes(storeId) ||
      orderedCustomerIds.includes(c.id),
  );

  if (searchQuery.trim()) {
    audience = audience.filter((c) =>
      customerMatchesSearch(c, searchQuery, getCustomerSeqId(c.id)),
    );
  }

  return [...audience].sort((a, b) => {
    const seqA = parseInt(getCustomerSeqId(a.id), 10) || 999999;
    const seqB = parseInt(getCustomerSeqId(b.id), 10) || 999999;
    return seqA - seqB;
  });
}

function getAudienceStatusLabel(
  customer: Customer,
  storeId: string,
  orderedCustomerIds: string[],
): string {
  if ((customer.followedStores ?? []).includes(storeId)) return "متابع";
  if (orderedCustomerIds.includes(customer.id)) return "طلب سابق";
  return "إشعارات مفعّلة";
}

type StoreAudiencePanelProps = {
  storeId: string;
  customers: Customer[];
  orders: Order[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  getCustomerSeqId: (id: string) => string;
  onSelectCustomer: (customerId: string) => void;
  onSendGift: (customerId: string, customerName: string) => void;
};

export const StoreAudiencePanel = memo(function StoreAudiencePanel({
  storeId,
  customers,
  orders,
  searchQuery,
  onSearchQueryChange,
  getCustomerSeqId,
  onSelectCustomer,
  onSendGift,
}) {
  const stats = useMemo(
    () => getStoreAudienceStats(storeId, customers, orders),
    [storeId, customers, orders],
  );

  const audience = useMemo(
    () => buildStoreAudienceList(storeId, customers, orders, searchQuery, getCustomerSeqId),
    [storeId, customers, orders, searchQuery, getCustomerSeqId],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, color: "text-violet", value: stats.followers, label: "المتابعين" },
          { icon: BellRing, color: "text-rose-400", value: stats.notifications, label: "الإشعارات" },
          { icon: ClipboardList, color: "text-emerald-400", value: stats.pastBuyers, label: "طلبّوا سابقاً" },
          { icon: Gift, color: "text-amber-400", value: stats.total, label: "إجمالي الزبائن" },
        ].map((item) => (
          <div
            key={item.label}
            className="merchant-inner-card p-4 rounded-2xl text-center shadow-sm min-h-[96px] flex flex-col items-center justify-center"
          >
            <item.icon size={22} className={`${item.color} mb-1.5`} />
            <span className="text-xl font-black text-on-brand leading-none">{item.value}</span>
            <span className="text-[10px] text-slate-400 font-bold mt-1">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="merchant-inner-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/10 merchant-panel-inset">
          <p className="text-xs font-black text-on-brand mb-3">بحث في قائمة الزبائن</p>
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="بحث بالاسم، الهاتف، أو رقم الزبون (#0001)..."
              className="w-full input-brand rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-purple/30"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {audience.length === 0 ? (
            <div className="col-span-full p-10 text-center text-slate-400 font-bold merchant-panel-inset rounded-xl border border-dashed border-white/15">
              لا يوجد زبائن مطابقون للبحث.
            </div>
          ) : (
            audience.map((c) => (
              <div
                key={c.id}
                className="merchant-inner-card rounded-xl p-4 flex flex-col hover:shadow-md hover:border-vibrant-purple/30 transition-all cursor-pointer min-w-0 h-full"
                onClick={() => onSelectCustomer(c.id)}
              >
                <div className="flex justify-between items-start gap-2 mb-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h4
                      className="font-black text-on-brand text-sm truncate flex items-center gap-1"
                      title={c.name}
                    >
                      <span>{c.name}</span>
                      <CopyButton text={c.name} size={10} />
                    </h4>
                    <span
                      className="text-[10px] font-mono text-violet inline-flex items-center gap-1 leading-none mt-1 select-all"
                      title={c.id}
                    >
                      <span>#{getCustomerSeqId(c.id)}</span>
                      <CopyButton text={getCustomerSeqId(c.id)} size={9} />
                    </span>
                    <span
                      className="text-[10px] font-bold text-slate-400 line-clamp-1 truncate mt-1 flex items-center gap-1"
                      title={c.phone}
                    >
                      <span dir="ltr">{c.phone}</span>
                      <CopyButton text={c.phone} size={9} />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{c.province}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md font-black text-[9px] shadow-sm shrink-0 ${
                      c.tier === "Diamond" || c.tier === "Platinum"
                        ? "bg-vibrant-purple text-white"
                        : c.tier === "Gold"
                          ? "bg-amber-400 text-amber-900"
                          : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {c.tier}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-2 mt-auto pt-3 border-t border-white/10 min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold merchant-panel-inset px-2 py-1 rounded-lg truncate">
                    {getAudienceStatusLabel(c, storeId, stats.orderedCustomerIds)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendGift(c.id, c.name);
                    }}
                    className="px-2.5 py-1.5 status-error-bg text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all font-bold text-[9px] flex items-center justify-center gap-1 shrink-0"
                    title="إرسال خصم خاص (هدية)"
                  >
                    <Gift size={14} />
                    <span>هدية</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
