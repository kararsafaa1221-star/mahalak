export const BULK_QUANTITY_LABEL = 'متاح بكميات كبيرة';

export function hasTrackedInventory(inventory?: number | null): boolean {
  return typeof inventory === 'number' && Number.isFinite(inventory);
}

export function isBulkQuantityProduct(inventory?: number | null): boolean {
  return !hasTrackedInventory(inventory);
}

export function isProductOutOfStock(inventory?: number | null): boolean {
  return hasTrackedInventory(inventory) && inventory === 0;
}

export function getProductAvailabilityLabel(inventory?: number | null): string {
  if (isBulkQuantityProduct(inventory)) return BULK_QUANTITY_LABEL;
  if (inventory === 0) return 'نفذت الكمية';
  return `متوفر في المخزن (${inventory} قطعة)`;
}

export function getMerchantInventoryLabel(inventory?: number | null): string {
  if (isBulkQuantityProduct(inventory)) return BULK_QUANTITY_LABEL;
  return `المتوفر: ${inventory}`;
}

export function getMerchantInventoryDotClass(inventory?: number | null): string {
  if (isBulkQuantityProduct(inventory)) return 'bg-emerald-400';
  if ((inventory as number) > 10) return 'bg-emerald-400';
  if ((inventory as number) > 0) return 'bg-amber-400';
  return 'bg-red-400 animate-pulse';
}

export function canOrderProductQuantity(
  inventory: number | null | undefined,
  requestedQty: number,
  alreadyInCart = 0,
): { ok: boolean; message?: string } {
  if (isProductOutOfStock(inventory)) {
    return { ok: false, message: 'نفذت كمية هذا المنتج.' };
  }
  if (!hasTrackedInventory(inventory)) {
    return { ok: true };
  }
  const remaining = (inventory as number) - alreadyInCart;
  if (requestedQty > remaining) {
    return {
      ok: false,
      message: remaining <= 0
        ? 'نفذت كمية هذا المنتج.'
        : `الكمية المتبقية في المخزن: ${remaining} قطعة فقط.`,
    };
  }
  return { ok: true };
}
