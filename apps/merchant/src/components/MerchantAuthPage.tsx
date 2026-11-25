import React from 'react';
import { useTranslation } from 'react-i18next';
import { WelcomeAuthPage } from '@shared/components/WelcomeAuthPage';

interface MerchantAuthPageProps {
  children: React.ReactNode;
  contentKey?: string;
}

export const MerchantAuthPage: React.FC<MerchantAuthPageProps> = ({ children, contentKey }) => {
  const { t } = useTranslation();
  return (
    <WelcomeAuthPage contentKey={contentKey} ariaLabel={t('auth.merchantLoginAria')}>
      {children}
    </WelcomeAuthPage>
  );
};
