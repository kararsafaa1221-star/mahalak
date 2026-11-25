import React from 'react';
import { useTranslation } from 'react-i18next';
import { WelcomeAuthPage } from '@shared/components/WelcomeAuthPage';

interface CustomerAuthPageProps {
  children: React.ReactNode;
  contentKey?: string;
}

export const CustomerAuthPage: React.FC<CustomerAuthPageProps> = ({ children, contentKey }) => {
  const { t } = useTranslation();
  return (
    <WelcomeAuthPage contentKey={contentKey} ariaLabel={t('auth.customerLoginAria')}>
      {children}
    </WelcomeAuthPage>
  );
};
