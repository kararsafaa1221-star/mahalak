import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { LegalSheetModal } from './LegalSheetModal';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <LegalSheetModal open={open} onClose={onClose} title={t('profile.privacy')} icon={FileText} variant="home">
      <PrivacyPolicyContent compact showHeader />
    </LegalSheetModal>
  );
};
