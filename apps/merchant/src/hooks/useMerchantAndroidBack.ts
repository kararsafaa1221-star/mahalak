import { useEffect, useRef } from 'react';
import { registerAndroidBackHandler } from '@shared/hooks/useAndroidBackButton';

type MerchantView =
  | 'login'
  | 'signup'
  | 'otp'
  | 'forgot'
  | 'dashboard'
  | 'onboarding'
  | 'terms-agreement';

export type MerchantNavState = {
  isAppNavMerchant: true;
  view: MerchantView;
  activeTab: string;
  showNotifications: boolean;
};

export type MerchantBackSnapshot = {
  view: MerchantView;
  activeTab: string;
  showNotifications: boolean;
  iframeUrl: string | null;
  showShareModal: boolean;
  showSubscriptionModal: boolean;
  showUnsavedModal: boolean;
  showTermsModal: boolean;
  showInvoiceModal: boolean;
  showShippingLabelModal: boolean;
  showPasswordChange: boolean;
  showPrivacyPolicy: boolean;
  showAboutUs: boolean;
  showBgRemoverModal: boolean;
  showScanner: boolean;
  showBulkEditModal: boolean;
  showQRMenu: boolean;
  showNotificationModal: boolean;
  prodModalShow: boolean;
  promoModal: boolean;
  actionModalShow: boolean;
  giftModalShow: boolean;
  replacementModalShow: boolean;
  returnConfirmModalShow: boolean;
};

export type MerchantBackActions = {
  setView: (view: MerchantView) => void;
  setActiveTab: (tab: string) => void;
  setShowNotifications: (show: boolean) => void;
  setIframeUrl: (url: string | null) => void;
  setShowShareModal: (show: boolean) => void;
  setShowSubscriptionModal: (show: boolean) => void;
  setShowUnsavedModal: (show: boolean) => void;
  setPendingTab: (tab: string | null) => void;
  setShowTermsModal: (show: boolean) => void;
  setShowInvoiceModal: (show: boolean) => void;
  setShowShippingLabelModal: (show: boolean) => void;
  setShowPasswordChange: (show: boolean) => void;
  setShowPrivacyPolicy: (show: boolean) => void;
  setShowAboutUs: (show: boolean) => void;
  setShowBgRemoverModal: (show: boolean) => void;
  setShowScanner: (show: boolean) => void;
  setShowBulkEditModal: (show: boolean) => void;
  setShowQRMenu: (show: boolean) => void;
  setShowNotificationModal: (show: boolean) => void;
  closeProdModal: () => void;
  setPromoModal: (show: boolean) => void;
  closeActionModal: () => void;
  closeGiftModal: () => void;
  closeReplacementModal: () => void;
  closeReturnConfirmModal: () => void;
};

type UseMerchantAndroidBackOptions = {
  isPopStateRef: React.MutableRefObject<boolean>;
  appNavDepthRef: React.MutableRefObject<number>;
  getHashUrl: (state: MerchantNavState) => string;
  getSnapshot: () => MerchantBackSnapshot;
  actions: MerchantBackActions;
};

function buildNavState(snapshot: MerchantBackSnapshot): MerchantNavState {
  return {
    isAppNavMerchant: true,
    view: snapshot.view,
    activeTab: snapshot.activeTab,
    showNotifications: snapshot.showNotifications,
  };
}

function applyNavState(
  state: MerchantNavState,
  isPopStateRef: React.MutableRefObject<boolean>,
  appNavDepthRef: React.MutableRefObject<number>,
  getHashUrl: (state: MerchantNavState) => string,
  actions: MerchantBackActions,
) {
  isPopStateRef.current = true;
  actions.setView(state.view);
  actions.setActiveTab(state.activeTab);
  actions.setShowNotifications(state.showNotifications);
  window.history.replaceState(state, '', getHashUrl(state));
  appNavDepthRef.current = Math.max(1, appNavDepthRef.current - 1);
  setTimeout(() => {
    isPopStateRef.current = false;
  }, 50);
}

function stepBackInApp(
  snapshot: MerchantBackSnapshot,
  isPopStateRef: React.MutableRefObject<boolean>,
  appNavDepthRef: React.MutableRefObject<number>,
  getHashUrl: (state: MerchantNavState) => string,
  actions: MerchantBackActions,
): boolean {
  if (snapshot.showNotifications) {
    applyNavState(
      { ...buildNavState(snapshot), showNotifications: false },
      isPopStateRef,
      appNavDepthRef,
      getHashUrl,
      actions,
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

export function useMerchantAndroidBack({
  isPopStateRef,
  appNavDepthRef,
  getHashUrl,
  getSnapshot,
  actions,
}: UseMerchantAndroidBackOptions) {
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

      if (snapshot.iframeUrl) {
        a.setIframeUrl(null);
        return true;
      }
      if (snapshot.returnConfirmModalShow) {
        a.closeReturnConfirmModal();
        return true;
      }
      if (snapshot.replacementModalShow) {
        a.closeReplacementModal();
        return true;
      }
      if (snapshot.actionModalShow) {
        a.closeActionModal();
        return true;
      }
      if (snapshot.giftModalShow) {
        a.closeGiftModal();
        return true;
      }
      if (snapshot.prodModalShow) {
        a.closeProdModal();
        return true;
      }
      if (snapshot.promoModal) {
        a.setPromoModal(false);
        return true;
      }
      if (snapshot.showBulkEditModal) {
        a.setShowBulkEditModal(false);
        return true;
      }
      if (snapshot.showBgRemoverModal) {
        a.setShowBgRemoverModal(false);
        return true;
      }
      if (snapshot.showScanner) {
        a.setShowScanner(false);
        return true;
      }
      if (snapshot.showInvoiceModal) {
        a.setShowInvoiceModal(false);
        return true;
      }
      if (snapshot.showShippingLabelModal) {
        a.setShowShippingLabelModal(false);
        return true;
      }
      if (snapshot.showShareModal) {
        a.setShowShareModal(false);
        return true;
      }
      if (snapshot.showTermsModal) {
        a.setShowTermsModal(false);
        return true;
      }
      if (snapshot.showUnsavedModal) {
        a.setShowUnsavedModal(false);
        a.setPendingTab(null);
        return true;
      }
      if (snapshot.showNotificationModal) {
        a.setShowNotificationModal(false);
        return true;
      }
      if (snapshot.showSubscriptionModal) {
        a.setShowSubscriptionModal(false);
        return true;
      }
      if (snapshot.showPasswordChange) {
        a.setShowPasswordChange(false);
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
      if (snapshot.showQRMenu) {
        a.setShowQRMenu(false);
        return true;
      }

      const inDeepNav =
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

      // الشاشة الرئيسية — ابقَ داخل التطبيق
      return true;
    });
  }, [appNavDepthRef, isPopStateRef]);
}
