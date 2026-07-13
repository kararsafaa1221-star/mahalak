import React from 'react';
import { WelcomeAuthPage } from '@shared/components/WelcomeAuthPage';

interface CustomerAuthPageProps {
  children: React.ReactNode;
  contentKey?: string;
}

export const CustomerAuthPage: React.FC<CustomerAuthPageProps> = ({ children, contentKey }) => (
  <WelcomeAuthPage contentKey={contentKey} ariaLabel="تسجيل دخول الزبون">
    {children}
  </WelcomeAuthPage>
);
