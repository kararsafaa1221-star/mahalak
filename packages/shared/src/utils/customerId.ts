/** Display ID for customers in admin UI (e.g. 0001, 0002). */
export function formatCustomerSeqId(value: number | string | undefined | null): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/^#/, ''));
  if (!Number.isFinite(n) || n <= 0) return String(value).replace(/^#/, '');
  return String(Math.floor(n)).padStart(4, '0');
}

export interface CustomerSearchable {
  id: string;
  name?: string;
  phone?: string;
  customerNumber?: number;
}

export function customerMatchesSeqSearch(
  customerNumber: number | undefined,
  computedSeqId: string,
  query: string,
): boolean {
  const q = query.trim().replace(/^#/, '');
  if (!q) return true;

  if (computedSeqId.includes(q)) return true;
  if (customerNumber != null && String(customerNumber).includes(q)) return true;
  if (customerNumber != null && formatCustomerSeqId(customerNumber).includes(q)) return true;

  const asNum = Number(q);
  if (Number.isFinite(asNum) && asNum > 0) {
    if (customerNumber === asNum) return true;
    if (parseInt(computedSeqId, 10) === asNum) return true;
  }

  return false;
}

/** Match customer by name, phone, Firebase id, or sequential display id (#0001). */
export function customerMatchesSearch(
  customer: CustomerSearchable,
  query: string,
  displaySeqId = '',
): boolean {
  const q = query.trim();
  if (!q) return true;

  const qLower = q.toLowerCase();
  if (customer.name?.toLowerCase().includes(qLower)) return true;
  if (customer.phone?.includes(q)) return true;
  if (customer.id.toLowerCase().includes(qLower)) return true;

  const seqId = displaySeqId || formatCustomerSeqId(customer.customerNumber);
  return customerMatchesSeqSearch(customer.customerNumber, seqId, q);
}

/** Match order rows by customer fields (name, phone, ids). */
export function orderMatchesCustomerSearch(
  order: { customerId?: string; customerName?: string },
  query: string,
  options?: {
    customer?: CustomerSearchable | null;
    displaySeqId?: string;
  },
): boolean {
  const q = query.trim();
  if (!q) return true;

  const qLower = q.toLowerCase();
  if (order.customerName?.toLowerCase().includes(qLower)) return true;
  if (!order.customerId) return false;
  if (order.customerId.toLowerCase().includes(qLower)) return true;

  if (options?.customer) {
    return customerMatchesSearch(
      options.customer,
      q,
      options.displaySeqId ?? formatCustomerSeqId(options.customer.customerNumber),
    );
  }

  if (options?.displaySeqId) {
    return customerMatchesSeqSearch(undefined, options.displaySeqId, q);
  }

  return false;
}
