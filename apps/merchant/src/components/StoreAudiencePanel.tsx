import React, { memo, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  ChevronRight,
  ClipboardList,
  Eye,
  Gift,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Customer, Order } from "@shared/types";
import { CopyButton } from "@shared/components/CopyButton";
import {
  formatStoreVisitCount,
  subscribeStoreVisitStats,
} from "@shared/lib/storeVisitTracking";
import { useLocale } from "@shared/i18n/LocaleProvider";
import {
  buildStoreAudienceList,
  getStoreAudienceStats,
  type AudienceCustomer,
  type StoreAudienceSegment,
} from "../utils/storeAudience";

function getAudienceStatusLabel(
  customer: AudienceCustomer,
  storeId: string,
  orderedCustomerIds: string[],
  t: (key: string) => string,
): string {
  if ((customer.followedStores ?? []).includes(storeId)) return t("merchant.audience.followers");
  if (customer.storeAudienceOrdered || orderedCustomerIds.includes(customer.id)) {
    return t("merchant.audience.pastBuyers");
  }
  return t("merchant.audience.notifications");
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
  /** يُستدعى عند فتح/إغلاق صفحة شريحة الجمهور (للرجوع بزر أندرويد) */
  onSegmentChange?: (segment: StoreAudienceSegment | null) => void;
  activeSegment?: StoreAudienceSegment | null;
};

const SEGMENT_CARDS: Array<{
  key: StoreAudienceSegment;
  icon: typeof Users;
  color: string;
  valueKey: "followers" | "notifications" | "pastBuyers" | "total";
}> = [
  { key: "followers", icon: Users, color: "text-[#fff700]", valueKey: "followers" },
  { key: "notifications", icon: BellRing, color: "text-rose-300", valueKey: "notifications" },
  { key: "pastBuyers", icon: ClipboardList, color: "text-emerald-300", valueKey: "pastBuyers" },
  { key: "total", icon: Gift, color: "text-amber-300", valueKey: "total" },
];

function AudienceCustomerCard({
  customer,
  storeId,
  orderedCustomerIds,
  getCustomerSeqId,
  onSelectCustomer,
  onSendGift,
}: {
  customer: AudienceCustomer;
  storeId: string;
  orderedCustomerIds: string[];
  getCustomerSeqId: (id: string) => string;
  onSelectCustomer: (customerId: string) => void;
  onSendGift: (customerId: string, customerName: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="bg-white/5 border border-white/15 rounded-xl p-4 flex flex-col hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer min-w-0 h-full"
      onClick={() => onSelectCustomer(customer.id)}
    >
      <div className="flex justify-between items-start gap-2 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h4
            className="font-black text-white text-sm truncate flex items-center gap-1"
            title={customer.name}
          >
            <span>{customer.name}</span>
            <CopyButton text={customer.name} size={10} />
          </h4>
          <span
            className="text-[10px] font-mono text-[#fff700] inline-flex items-center gap-1 leading-none mt-1 select-all"
            title={customer.id}
          >
            <span>#{getCustomerSeqId(customer.id)}</span>
            <CopyButton text={getCustomerSeqId(customer.id)} size={9} />
          </span>
          <span
            className="text-[10px] font-bold text-white/55 line-clamp-1 truncate mt-1 flex items-center gap-1"
            title={customer.phone}
          >
            <span dir="ltr">{customer.phone}</span>
            <CopyButton text={customer.phone} size={9} />
          </span>
          <span className="text-[10px] font-bold text-white/45 mt-0.5">{customer.province}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md font-black text-[9px] shadow-sm shrink-0 ${
            customer.tier === "Diamond" || customer.tier === "Platinum"
              ? "bg-vibrant-purple text-white"
              : customer.tier === "Gold"
                ? "bg-amber-400 text-amber-900"
                : "bg-white/10 text-white/70"
          }`}
        >
          {customer.tier}
        </span>
      </div>

      <div className="flex justify-between items-center gap-2 mt-auto pt-3 border-t border-white/10 min-w-0">
        <span className="text-[10px] text-white/55 font-bold bg-white/5 border border-white/10 px-2 py-1 rounded-lg truncate">
          {getAudienceStatusLabel(customer, storeId, orderedCustomerIds, t)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSendGift(customer.id, customer.name);
          }}
          className="px-2.5 py-1.5 status-error-bg text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all font-bold text-[9px] flex items-center justify-center gap-1 shrink-0"
          title={t("merchant.audience.gift")}
        >
          <Gift size={14} />
          <span>{t("merchant.audience.gift")}</span>
        </button>
      </div>
    </div>
  );
}

export const StoreAudiencePanel = memo(function StoreAudiencePanel({
  storeId,
  customers,
  orders,
  searchQuery,
  onSearchQueryChange,
  getCustomerSeqId,
  onSelectCustomer,
  onSendGift,
  onSegmentChange,
  activeSegment: controlledSegment,
}: StoreAudiencePanelProps) {
  const { t } = useTranslation();
  const { language } = useLocale();
  const [visitCount, setVisitCount] = useState(0);
  const [internalSegment, setInternalSegment] = useState<StoreAudienceSegment | null>(null);
  const activeSegment = controlledSegment !== undefined ? controlledSegment : internalSegment;

  useEffect(() => {
    if (!storeId) {
      setVisitCount(0);
      return;
    }
    return subscribeStoreVisitStats(storeId, (stats) => {
      setVisitCount(stats.visitCount);
    });
  }, [storeId]);

  const segmentLabels: Record<StoreAudienceSegment, string> = {
    followers: t("merchant.audience.followers"),
    notifications: t("merchant.audience.notifications"),
    pastBuyers: t("merchant.audience.pastBuyers"),
    total: t("merchant.audience.total"),
  };

  const setActiveSegment = (segment: StoreAudienceSegment | null) => {
    if (controlledSegment === undefined) setInternalSegment(segment);
    onSegmentChange?.(segment);
  };

  const stats = useMemo(
    () => getStoreAudienceStats(storeId, customers, orders),
    [storeId, customers, orders],
  );

  const audience = useMemo(
    () =>
      activeSegment
        ? buildStoreAudienceList(
            storeId,
            customers,
            orders,
            searchQuery,
            getCustomerSeqId,
            activeSegment,
          )
        : [],
    [storeId, customers, orders, searchQuery, getCustomerSeqId, activeSegment],
  );

  if (activeSegment) {
    const SegmentIcon =
      SEGMENT_CARDS.find((card) => card.key === activeSegment)?.icon ?? Users;
    const segmentColor =
      SEGMENT_CARDS.find((card) => card.key === activeSegment)?.color ?? "text-[#fff700]";

    return (
      <div className="merchant-glass-page space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onSearchQueryChange("");
              setActiveSegment(null);
            }}
            className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition shrink-0"
            aria-label={t("common.back")}
          >
            <ChevronRight size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <SegmentIcon size={18} className={segmentColor} />
              {segmentLabels[activeSegment]}
            </h3>
            <p className="text-[10px] text-white/55 font-bold mt-0.5">
              {audience.length} {t("merchant.audience.inList")}
            </p>
          </div>
        </div>

        <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm text-white">
          <div className="p-4 border-b border-white/15 bg-white/5">
            <p className="text-xs font-black text-[#fff700] mb-3">{t("merchant.audience.search")}</p>
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                placeholder={t("merchant.audience.searchPlaceholder")}
                className="w-full bg-white/5 border border-white/25 text-white placeholder:text-white/40 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-purple/40"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {audience.length === 0 ? (
              <div className="col-span-full p-10 text-center text-white/50 font-bold bg-white/5 rounded-xl border border-dashed border-white/15">
                {t("merchant.audience.empty")}
              </div>
            ) : (
              audience.map((c) => (
                <AudienceCustomerCard
                  key={c.id}
                  customer={c}
                  storeId={storeId}
                  orderedCustomerIds={stats.orderedCustomerIds}
                  getCustomerSeqId={getCustomerSeqId}
                  onSelectCustomer={onSelectCustomer}
                  onSendGift={onSendGift}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-glass-page space-y-5">
      <div className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-2xl text-center text-white flex flex-col items-center justify-center gap-1">
        <Eye size={22} className="text-violet-300 mb-0.5" />
        <span className="text-2xl font-black text-white leading-none">
          {formatStoreVisitCount(visitCount, language)}
        </span>
        <span className="text-[10px] text-white/60 font-bold">
          {t("merchant.audience.visits")}
        </span>
        <span className="text-[9px] text-white/40 font-bold max-w-[16rem] leading-snug">
          {t("merchant.audience.visitsHint")}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEGMENT_CARDS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSearchQueryChange("");
              setActiveSegment(item.key);
            }}
            className="welcome-card-glow welcome-card-border-glow bg-white/5 border border-white/30 backdrop-blur-md p-4 rounded-2xl text-center shadow-sm min-h-[96px] flex flex-col items-center justify-center text-white hover:bg-white/10 hover:border-white/45 active:scale-[0.98] transition-all cursor-pointer"
          >
            <item.icon size={22} className={`${item.color} mb-1.5`} />
            <span className="text-xl font-black text-white leading-none">{stats[item.valueKey]}</span>
            <span className="text-[10px] text-white/60 font-bold mt-1">
              {segmentLabels[item.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
