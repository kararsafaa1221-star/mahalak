export interface Province { id: string; name: string; }
export interface SubscriptionPlan { id: string; name: string; durationMonths: number; price: number; discountText: string; }
export interface Store {
  id: string;
  ownerName: string;
  shopName: string;
  category?: string;
  username: string;
  phone: string;
  password: string;
  ownerId?: string;
  province: string;
  area: string;
  landmark: string;
  lat?: number;
  lng?: number;
  logo: string;
  deliveryPrice: number;
  isFreeDelivery: boolean;
  status: 'pending' | 'active' | 'suspended';
  subscriptionId: string;
  subscriptionExpiry: string;
  rating: number;
  badges?: string[];
  objectId?: string;
  fcmToken?: string;
  lastUsernameChange?: string;
  isBanned?: boolean;
  showArea?: boolean;
  showLandmark?: boolean;
  showMap?: boolean;
  showPhone?: boolean;
  isVerified?: boolean;
  verificationType?: 'days' | 'months' | 'years' | 'lifetime';
  verificationExpiresAt?: string;
  is_virtual?: boolean;
  walletBalance?: number;
  payoutMethods?: { zainCashNumber?: string; mastercardNumber?: string; };
  subscriptionStatus?: 'none' | 'active' | 'expired';
  subscriptionValidUntil?: string;
  /** Amount (IQD) recorded when subscription was last activated/renewed */
  subscriptionAmountIqd?: number;
  /** Cumulative subscription revenue from this store (increments on each renewal) */
  subscriptionLifetimeRevenueIqd?: number;
  /** ISO timestamp of last subscription payment/activation */
  subscriptionLastActivatedAt?: string;
  /** YYYY-MM-DD expiry date (or Lifetime) — mirrors subscriptionExpiry for queries/display */
  subscriptionExpiryDate?: string;
  /** Duration granted by auto-subscription on registration */
  autoSubscriptionDuration?: { value: number; unit: 'days' | 'months' | 'years' };
  /** When true, skip auto-subscription for this merchant */
  autoSubscriptionDisabled?: boolean;
  workingHours?: string;
  deliveryAreas?: string;
  storeCoverType?: 'image' | 'color';
  storeCoverValue?: string;
  signature?: string;
  contractAgreedAt?: string;
  terms_accepted?: boolean;
  signed_at?: string;
  promoBanner?: {
    title: string;
    subtitle: string;
    backgroundColor: string;
    textColor: string;
    isActive: boolean;
  };
  /** Merchant-defined colors for the customer-facing store page */
  storeTheme?: {
    enabled: boolean;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textOnPrimary: string;
    pageBackground?: string;
    gradientStyle?: 'linear' | 'radial';
    gradientDirection?:
      | 'to-right'
      | 'to-left'
      | 'to-bottom'
      | 'to-top'
      | 'to-bottom-right'
      | 'to-bottom-left'
      | 'to-top-right'
      | 'to-top-left';
    radialPosition?:
      | 'center'
      | 'top'
      | 'bottom'
      | 'top-right'
      | 'top-left'
      | 'bottom-right'
      | 'bottom-left';
    headerBackground?: string;
    infoBarBackground?: string;
    infoBarTextColor?: string;
    infoBarBorderColor?: string;
    shopNameColor?: string;
    sectionTitleColor?: string;
    pageTextColor?: string;
    iconColor?: string;
    filterBadgeColor?: string;
    filterChipActiveText?: string;
    buttonTextColor?: string;
    cardPrimaryColor?: string;
    cardSecondaryColor?: string;
    productCardTextColor?: string;
    productPriceColor?: string;
    addToCartIconColor?: string;
    addToCartButtonBg?: string;
    colorFills?: Partial<
      Record<
        string,
        {
          mode?: 'solid' | 'gradient';
          solid?: string;
          gradientFrom?: string;
          gradientTo?: string;
          gradientDirection?:
            | 'to-right'
            | 'to-left'
            | 'to-bottom'
            | 'to-top'
            | 'to-bottom-right'
            | 'to-bottom-left'
            | 'to-top-right'
            | 'to-top-left';
        }
      >
    >;
  };
  /** Set when the merchant permanently deletes their account */
  isDeleted?: boolean;
  deletedAt?: string;
  dashboardTourCompletedAt?: string;
}
export interface Product { id: string; storeId: string; name: string; description: string; price: number; costPrice?: number; inventory?: number; discountType: 'none' | 'percent' | 'amount'; discountValue: number; finalPrice: number; image: string; status: 'published' | 'draft' | 'archived'; isFreeDelivery: boolean; specialOffer?: string; tags?: string[]; rating?: number; createdAt: string; barcode?: string; category?: string; objectId?: string; color?: string; size?: string; length?: string; width?: string; weight?: string; condition?: string; warranty?: string; brand?: string; is_virtual?: boolean; }
export interface Customer { 
  id: string;
  authUid?: string;
  name: string;
  phone: string; 
  password: string; 
  province: string; 
  address: string; 
  points: number; 
  ordersCount: number; 
  monthlyOrdersCount: number;
  lastResetMonth: string; // YYYY-MM
  joinedAt?: string;
  /** Sequential display number assigned on signup (1, 2, 3…). */
  customerNumber?: number;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'Diamond'; 
  followedStores: string[]; 
  storeNotifications: string[]; 
  isBlocked: boolean; 
  objectId?: string; 
  lat?: number; 
  lng?: number;
  /** Named delivery locations (home, work, custom) */
  savedLocations?: CustomerSavedLocation[];
  defaultLocationId?: string;
  fcmToken?: string;
  is_virtual?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface CustomerSavedLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
  province: string;
  area: string;
  mahalla?: string;
  zuqaq?: string;
  dar?: string;
  landmark: string;
  /** Reverse-geocoded map label */
  address?: string;
  isDefault?: boolean;
}
export interface Order { id: string; storeId: string; storeName: string; customerId: string; customerName: string; customerPhone: string; customerAddress: string; customerProvince: string; customerLat?: number; customerLng?: number; items: any[]; subtotal: number; deliveryPrice: number; discountAmount: number; total: number; status: 'pending' | 'accepted' | 'shipped' | 'delivered' | 'returned' | 'replaced' | 'rejected'; rejectionReason?: string; returnReason?: string; createdAt: string; promoCode?: string; objectId?: string; discountSponsor?: 'ADMIN' | 'MERCHANT'; }

export interface PayoutRequest {
  id: string;
  merchantId: string;
  requestedAmount: number;
  payoutMethodUsed: 'zain_cash' | 'mastercard';
  payoutMethodDetails: string; // The number or account detail
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface PromoCode { id: string; storeId: string; code: string; discountType?: 'percent' | 'amount' | 'FIXED' | 'PERCENTAGE'; discountValue: number; maxUses: number; maxUsesPerUser?: number; usedCount: number; status: 'active' | 'expired' | 'used'; startDate?: string; expiresAt?: string | null; source?: 'merchant' | 'admin' | 'points'; ownerCustomerId?: string; createdAt?: string; targetStores?: string[] | 'ALL'; targetProvinces?: string[]; amount?: number; objectId?: string; sponsor?: 'ADMIN' | 'MERCHANT'; merchantId?: string | null; discountAmount?: number; expirationDate?: string | null; targetAudience?: 'ALL' | 'FOLLOWERS' | 'PAST_BUYERS' | 'FOLLOWERS_AND_PAST_BUYERS'; maxGlobalUses?: number; currentGlobalUses?: number; validityDays?: number; }
export interface RechargeCode { id: string; code: string; points: number; status: 'active' | 'used'; usedBy?: string; usedAt?: string; createdAt: string; objectId?: string; }
export interface StoreReview {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  rating: number;
  message: string;
  createdAt: string;
  isReadByAdmin?: boolean;
}
export interface ProductReview {
  id: string;
  productId: string;
  storeId: string;
  customerId: string;
  customerName: string;
  rating: number;
  message?: string;
  createdAt: string;
}
export interface AppNotification { 
  id: string; 
  userId: string; 
  role: 'customer' | 'merchant' | 'admin'; 
  title: string; 
  message: string; 
  read: boolean; 
  createdAt: string; 
  type?: 'order' | 'subscription' | 'product' | 'promo' | 'event' | 'system';
  targetId?: string;
  objectId?: string; 
  actionLink?: string;
  actionText?: string;
}
export interface FlashSale { id: string; title: string; description: string; startTime: string; endTime: string; status: 'upcoming' | 'active' | 'ended' | 'paused'; objectId?: string; }
export interface FlashSaleRequest { id: string; flashSaleId: string; storeId: string; productId: string; status: 'pending' | 'approved' | 'rejected'; promotionalPrice: number; quantityLimit?: number; objectId?: string; }

export interface PayoutRequest {
  id: string;
  merchantId: string;
  requestedAmount: number;
  payoutMethodDetails: {
    zainCashNumber?: string;
    mastercardNumber?: string;
  };
  status: 'pending' | 'completed';
  createdAt: string;
}

