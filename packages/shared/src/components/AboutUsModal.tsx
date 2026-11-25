import React from 'react';
import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AboutUsContent } from './AboutUsContent';
import { LegalSheetModal } from './LegalSheetModal';

interface AboutUsModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <LegalSheetModal open={open} onClose={onClose} title={t('profile.about')} icon={Store} variant="home">
      <AboutUsContent compact showHeader />
    </LegalSheetModal>
  );
};
