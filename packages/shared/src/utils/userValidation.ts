import { Customer, Store } from '@shared/types';

export const validateUserStatus = (userData: Partial<Customer | Store>, type: 'customer' | 'merchant'): { valid: boolean; reason?: 'blocked' | 'deleted' | 'suspended' | 'banned' | null; message: string } => {
  if (!userData) {
    return { valid: false, reason: 'deleted', message: '⚠️ تم حذف هذا الحساب نهائياً، ولا يمكن استعادته.' };
  }

  if (type === 'customer') {
    const cust = userData as Partial<Customer>;
    if (cust.isDeleted) {
      return { valid: false, reason: 'deleted', message: '⚠️ تم حذف هذا الحساب نهائياً، ولا يمكن استعادته.' };
    }
    if (cust.isBlocked) {
      return { valid: false, reason: 'blocked', message: '⚠️ عذراً، لقد تم حظر حسابك من قبل إدارة النظام لمخالفة الشروط.' };
    }
  } else if (type === 'merchant') {
    const store = userData as Partial<Store>;
    if (store.isDeleted) {
      return { valid: false, reason: 'deleted', message: '⚠️ تم حذف هذا الحساب نهائياً، ولا يمكن استعادته.' };
    }
    if (store.status === 'suspended') {
      return { valid: false, reason: 'suspended', message: '⚠️ متجرك معلق حالياً. يرجى مراجعة الإدارة.' };
    }
    if (store.isBanned) {
      return { valid: false, reason: 'banned', message: '⚠️ تم حظر متجرك نهائياً لمخالفة الشروط.' };
    }
  }
  
  return { valid: true, reason: null, message: 'صالح' };
};
