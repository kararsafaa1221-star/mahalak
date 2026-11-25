import type { Customer, Order } from '@shared/types';
import { customerMatchesSearch } from '@shared/utils/customerId';

/** Extra flag mirrored from `store_audience/{storeId}/members` (not on Customer schema). */
export type AudienceCustomer = Customer & {
  storeAudienceOrdered?: boolean;
};

export type StoreAudienceSegment =
  | 'followers'
  | 'notifications'
  | 'pastBuyers'
  | 'total';

export const STORE_AUDIENCE_SEGMENT_LABELS: Record<StoreAudienceSegment, string> = {
  followers: 'المتابعين',
  notifications: 'الإشعارات',
  pastBuyers: 'طلبّوا سابقاً',
  total: 'إجمالي الجمهور',
};

export function getOrderedCustomerIds(storeId: string, orders: Order[]): string[] {
  return Array.from(
    new Set(
      orders
        .filter((order) => order.storeId === storeId)
        .map((order) => order.customerId)
        .filter(Boolean),
    ),
  ) as string[];
}

function isPastBuyer(
  customer: AudienceCustomer,
  orderedSet: Set<string>,
): boolean {
  // Prefer the server audience mirror flag — local orders are capped (e.g. last 400)
  // and can flicker while the orders listener loads.
  if (customer.storeAudienceOrdered === true) return true;
  return orderedSet.has(customer.id);
}

export function customerMatchesAudienceSegment(
  customer: AudienceCustomer,
  storeId: string,
  orderedCustomerIds: string[],
  segment: StoreAudienceSegment,
): boolean {
  const isFollower = (customer.followedStores ?? []).includes(storeId);
  const hasNotifications = (customer.storeNotifications ?? []).includes(storeId);
  const pastBuyer = isPastBuyer(customer, new Set(orderedCustomerIds));

  switch (segment) {
    case 'followers':
      return isFollower;
    case 'notifications':
      return hasNotifications;
    case 'pastBuyers':
      return pastBuyer;
    case 'total':
      return isFollower || hasNotifications || pastBuyer;
    default:
      return false;
  }
}

export function getStoreAudienceStats(
  storeId: string,
  customers: AudienceCustomer[],
  orders: Order[],
) {
  const orderedFromOrders = getOrderedCustomerIds(storeId, orders);
  const orderedSet = new Set(orderedFromOrders);

  let followers = 0;
  let notifications = 0;
  let pastBuyers = 0;
  let total = 0;
  const orderedCustomerIds = new Set<string>(orderedFromOrders);

  for (const customer of customers) {
    const isFollower = (customer.followedStores ?? []).includes(storeId);
    const hasNotifications = (customer.storeNotifications ?? []).includes(storeId);
    const pastBuyer = isPastBuyer(customer, orderedSet);

    if (pastBuyer) orderedCustomerIds.add(customer.id);
    if (isFollower) followers += 1;
    if (hasNotifications) notifications += 1;
    if (pastBuyer) pastBuyers += 1;
    if (isFollower || hasNotifications || pastBuyer) total += 1;
  }

  return {
    followers,
    notifications,
    pastBuyers,
    total,
    orderedCustomerIds: Array.from(orderedCustomerIds),
  };
}

export function buildStoreAudienceList(
  storeId: string,
  customers: AudienceCustomer[],
  orders: Order[],
  searchQuery: string,
  getCustomerSeqId: (id: string) => string,
  segment: StoreAudienceSegment = 'total',
): AudienceCustomer[] {
  const { orderedCustomerIds } = getStoreAudienceStats(storeId, customers, orders);
  let audience = customers.filter((customer) =>
    customerMatchesAudienceSegment(customer, storeId, orderedCustomerIds, segment),
  );

  if (searchQuery.trim()) {
    audience = audience.filter((customer) =>
      customerMatchesSearch(customer, searchQuery, getCustomerSeqId(customer.id)),
    );
  }

  return [...audience].sort((a, b) => {
    const seqA = parseInt(getCustomerSeqId(a.id), 10) || 999999;
    const seqB = parseInt(getCustomerSeqId(b.id), 10) || 999999;
    return seqA - seqB;
  });
}
