import type { Product } from '../types';
import { StorageService } from '../services/storageService';

export type CartLine = { product: Product; quantity: number };

function cartKey(customerId?: string | null) {
  return `CUSTOMER_CART_${customerId || 'guest'}`;
}

/** Load persisted cart for guest or logged-in customer. */
export function loadPersistedCart(customerId?: string | null): CartLine[] {
  const raw = StorageService.get<CartLine[]>(cartKey(customerId));
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item) =>
      item &&
      item.product &&
      typeof item.product.id === 'string' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0,
  );
}

/** Persist cart so it survives refresh / weak-network restarts. */
export function savePersistedCart(customerId: string | null | undefined, cart: CartLine[]) {
  StorageService.save(cartKey(customerId), cart);
}

export function clearPersistedCart(customerId?: string | null) {
  StorageService.remove(cartKey(customerId));
}
