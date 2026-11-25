import React, { createContext, useContext } from 'react';
import type { Customer, Store } from '../types';

export interface AuthSessionContextValue {
  currentCustomer: Customer | null;
  currentMerchant: Store | null;
  authLoading: boolean;
  authInitialized: boolean;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within AppProvider');
  }
  return context;
}
