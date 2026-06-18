import { Store } from '../types';

export interface DeliveryInfo {
  isFree: boolean;
  price: number;
}

/**
 * Calculates the delivery cost and free status for a given customer province.
 */
export function getStoreDeliveryInfo(
  store: Partial<Store> | undefined,
  customerProvince: string | undefined
): DeliveryInfo {
  if (!store) {
    return { isFree: false, price: 0 };
  }

  const province = customerProvince || 'بغداد';
  const storeProvince = store.province || 'بغداد';

  // 1. Global free delivery check
  if (store.isFreeDelivery) {
    return { isFree: true, price: 0 };
  }

  // 2. Check override for specific province free delivery
  const provinceFreeDelivery = (store as any).provinceFreeDelivery || {};
  const customFree = provinceFreeDelivery[province];
  if (customFree !== undefined) {
    if (customFree) return { isFree: true, price: 0 };
  } else {
    // Check if local or other province free delivery is set
    if (province === storeProvince) {
      if ((store as any).localProvinceFreeDelivery) {
        return { isFree: true, price: 0 };
      }
    } else {
      if ((store as any).otherProvincesFreeDelivery) {
        return { isFree: true, price: 0 };
      }
    }
  }

  // 3. Fallback price calculation
  let price = store.deliveryPrice || 0;
  
  // Specific custom price for the province
  const provinceDeliveryPrices = (store as any).provinceDeliveryPrices || {};
  const customPrice = provinceDeliveryPrices[province];
  if (customPrice !== undefined) {
    price = Number(customPrice);
  } else {
    // Check local or other province delivery price
    if (province === storeProvince) {
      if ((store as any).localProvinceDeliveryPrice !== undefined) {
        price = Number((store as any).localProvinceDeliveryPrice);
      }
    } else {
      if ((store as any).otherProvincesDeliveryPrice !== undefined) {
        price = Number((store as any).otherProvincesDeliveryPrice);
      }
    }
  }

  return { isFree: false, price };
}
