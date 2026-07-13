import { useEffect, useRef } from 'react';
import { registerAndroidBackHandler } from '@shared/hooks/useAndroidBackButton';
import type { Product, Store } from '@shared/types';

type CustomerView = 'login' | 'signup' | 'otp' | 'forgot' | 'dashboard';

export type CustomerNavState = {
  isAppNav: true;
  view: CustomerView;
  activeTab: string;
  selectedStoreId: string | null;
  selectedProductDetailId: string | null;
  showCart: boolean;
  showNotifications: boolean;
  scrollY?: number;
};

export type CustomerBackSnapshot = {
  view: CustomerView;
  activeTab: string;
  selectedStore: Store | null;
  selectedProductDetail: Product | null;
  showCart: boolean;
  showNotifications: boolean;
  showShareModal: boolean;
  showRateModal: unknown;
  showCompareModal: { baseProduct: Product; listOpen: boolean } | null;
  showUnsavedModal: boolean;
  showRedeemConfirm: number | null;
  showCartLocationPicker: boolean;
  showHeaderLocationPicker: boolean;
  showPrivacyPolicy: boolean;
  showAboutUs: boolean;
  showMyInfo: boolean;
  showSavedLocations: boolean;
  showWallet: boolean;
  showOrderSuccess: boolean;
  showPasswordChange: boolean;
  showStoreProductCategories: boolean;
  showStoreProductSorting: boolean;
  showCategories: boolean;
  showSorting: boolean;
  showAllProductsSorting: boolean;
  showAllProductsCategories: boolean;
};

export type CustomerBackActions = {
  setView: (view: CustomerView) => void;
  setActiveTab: (tab: string) => void;
  setSelectedStore: (store: Store | null) => void;
  setSelectedProductDetail: (product: Product | null) => void;
  setShowCart: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  setShowRateModal: (value: null) => void;
  setShowCompareModal: (value: { baseProduct: Product; listOpen: boolean } | null) => void;
  reopenCompareList: () => void;
  setShowUnsavedModal: (show: boolean) => void;
  setPendingTab: (tab: string | null) => void;
  setShowRedeemConfirm: (value: number | null) => void;
  setShowCartLocationPicker: (show: boolean) => void;
  setShowHeaderLocationPicker: (show: boolean) => void;
  setShowPrivacyPolicy: (show: boolean) => void;
  setShowAboutUs: (show: boolean) => void;
  setShowMyInfo: (show: boolean) => void;
  setShowSavedLocations: (show: boolean) => void;
  setShowWallet: (show: boolean) => void;
  setShowOrderSuccess: (show: boolean) => void;
  setShowPasswordChange: (show: boolean) => void;
  setShowStoreProductCategories: (show: boolean) => void;
  setShowStoreProductSorting: (show: boolean) => void;
  setShowCategories: (show: boolean) => void;
  setShowSorting: (show: boolean) => void;
  setShowAllProductsSorting: (show: boolean) => void;
  setShowAllProductsCategories: (show: boolean) => void;
};

type UseCustomerAndroidBackOptions = {
  isPopStateRef: React.MutableRefObject<boolean>;
  appNavDepthRef: React.MutableRefObject<number>;
  getHashUrl: (state: CustomerNavState) => string;
  getSnapshot: () => CustomerBackSnapshot;
  actions: CustomerBackActions;
};

function buildNavState(snapshot: CustomerBackSnapshot): CustomerNavState {
  return {
    isAppNav: true,
    view: snapshot.view,
    activeTab: snapshot.activeTab,
    selectedStoreId: snapshot.selectedStore?.id ?? null,
    selectedProductDetailId: snapshot.selectedProductDetail?.id ?? null,
    showCart: snapshot.showCart,
    showNotifications: snapshot.showNotifications,
  };
}

function applyNavState(
  state: CustomerNavState,
  isPopStateRef: React.MutableRefObject<boolean>,
  appNavDepthRef: React.MutableRefObject<number>,
  getHashUrl: (state: CustomerNavState) => string,
  actions: CustomerBackActions,
  uniqueStore: Store | null,
  uniqueProduct: Product | null,
) {
  isPopStateRef.current = true;
  actions.setView(state.view);
  actions.setActiveTab(state.activeTab);
  actions.setSelectedStore(uniqueStore);
  actions.setSelectedProductDetail(uniqueProduct);
  actions.setShowCart(state.showCart);
  actions.setShowNotifications(state.showNotifications);
  window.history.replaceState(state, '', getHashUrl(state));
  appNavDepthRef.current = Math.max(1, appNavDepthRef.current - 1);
  setTimeout(() => {
    isPopStateRef.current = false;
  }, 50);
}

function stepBackInApp(
  snapshot: CustomerBackSnapshot,
  isPopStateRef: React.MutableRefObject<boolean>,
  appNavDepthRef: React.MutableRefObject<number>,
  getHashUrl: (state: CustomerNavState) => string,
  actions: CustomerBackActions,
): boolean {
  if (snapshot.selectedProductDetail) {
    applyNavState(
      {
        ...buildNavState(snapshot),
        selectedProductDetailId: null,
      },
      isPopStateRef,
      appNavDepthRef,
      getHashUrl,
      actions,
      snapshot.selectedStore,
      null,
    );
    return true;
  }

  if (snapshot.selectedStore) {
    applyNavState(
      {
        ...buildNavState(snapshot),
        selectedStoreId: null,
        selectedProductDetailId: null,
      },
      isPopStateRef,
      appNavDepthRef,
      getHashUrl,
      actions,
      null,
      null,
    );
    return true;
  }

  if (snapshot.showCart) {
    applyNavState(
      { ...buildNavState(snapshot), showCart: false },
      isPopStateRef,
      appNavDepthRef,
      getHashUrl,
      actions,
      null,
      null,
    );
    return true;
  }

  if (snapshot.showNotifications) {
    applyNavState(
      { ...buildNavState(snapshot), showNotifications: false },
      isPopStateRef,
      appNavDepthRef,
      getHashUrl,
      actions,
      null,
      null,
    );
    return true;
  }

  if (snapshot.view === 'otp' || snapshot.view === 'forgot') {
    actions.setView('login');
    return true;
  }

  if (snapshot.view === 'signup') {
    actions.setView('login');
    return true;
  }

  return false;
}

export function useCustomerAndroidBack({
  isPopStateRef,
  appNavDepthRef,
  getHashUrl,
  getSnapshot,
  actions,
}: UseCustomerAndroidBackOptions) {
  const getSnapshotRef = useRef(getSnapshot);
  const actionsRef = useRef(actions);
  const getHashUrlRef = useRef(getHashUrl);

  getSnapshotRef.current = getSnapshot;
  actionsRef.current = actions;
  getHashUrlRef.current = getHashUrl;

  useEffect(() => {
    return registerAndroidBackHandler(() => {
      const snapshot = getSnapshotRef.current();
      const a = actionsRef.current;

      if (snapshot.showShareModal) {
        a.setShowShareModal(false);
        return true;
      }
      if (snapshot.showRateModal) {
        a.setShowRateModal(null);
        return true;
      }
      if (snapshot.showCompareModal?.listOpen) {
        a.setShowCompareModal(null);
        return true;
      }
      if (snapshot.showCompareModal && !snapshot.showCompareModal.listOpen && snapshot.selectedProductDetail) {
        a.reopenCompareList();
        return true;
      }
      if (snapshot.showUnsavedModal) {
        a.setShowUnsavedModal(false);
        a.setPendingTab(null);
        return true;
      }
      if (snapshot.showRedeemConfirm !== null) {
        a.setShowRedeemConfirm(null);
        return true;
      }
      if (snapshot.showCartLocationPicker) {
        a.setShowCartLocationPicker(false);
        return true;
      }
      if (snapshot.showHeaderLocationPicker) {
        a.setShowHeaderLocationPicker(false);
        return true;
      }
      if (snapshot.showPrivacyPolicy) {
        a.setShowPrivacyPolicy(false);
        return true;
      }
      if (snapshot.showAboutUs) {
        a.setShowAboutUs(false);
        return true;
      }
      if (snapshot.showSavedLocations) {
        a.setShowSavedLocations(false);
        return true;
      }
      if (snapshot.showMyInfo) {
        a.setShowMyInfo(false);
        return true;
      }
      if (snapshot.showWallet) {
        a.setShowWallet(false);
        return true;
      }
      if (snapshot.showPasswordChange) {
        a.setShowPasswordChange(false);
        return true;
      }
      if (snapshot.showOrderSuccess) {
        a.setShowOrderSuccess(false);
        return true;
      }
      if (snapshot.showStoreProductSorting) {
        a.setShowStoreProductSorting(false);
        return true;
      }
      if (snapshot.showStoreProductCategories) {
        a.setShowStoreProductCategories(false);
        return true;
      }
      if (snapshot.showAllProductsSorting) {
        a.setShowAllProductsSorting(false);
        return true;
      }
      if (snapshot.showAllProductsCategories) {
        a.setShowAllProductsCategories(false);
        return true;
      }
      if (snapshot.showCategories) {
        a.setShowCategories(false);
        return true;
      }
      if (snapshot.showSorting) {
        a.setShowSorting(false);
        return true;
      }

      const inDeepNav =
        !!snapshot.selectedProductDetail ||
        !!snapshot.selectedStore ||
        snapshot.showCart ||
        snapshot.showNotifications ||
        snapshot.view !== 'dashboard';

      if (inDeepNav || appNavDepthRef.current > 1) {
        if (appNavDepthRef.current > 1) {
          window.history.back();
          return true;
        }

        if (stepBackInApp(snapshot, isPopStateRef, appNavDepthRef, getHashUrlRef.current, a)) {
          return true;
        }
      }

      // الشاشة الرئيسية — ابقَ داخل التطبيق ولا تخرج
      return true;
    });
  }, [appNavDepthRef, isPopStateRef]);
}
