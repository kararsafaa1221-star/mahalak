import React from 'react';
import { WelcomeAuthPage } from '@shared/components/WelcomeAuthPage';

interface MerchantAuthPageProps {
  children: React.ReactNode;
  contentKey?: string;
}

export const MerchantAuthPage: React.FC<MerchantAuthPageProps> = ({ children, contentKey }) => (
  <WelcomeAuthPage contentKey={contentKey} ariaLabel="لوحة تسجيل التاجر">
    {children}
  </WelcomeAuthPage>
);
