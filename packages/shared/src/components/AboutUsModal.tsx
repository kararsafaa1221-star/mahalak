import React from 'react';
import { Store } from 'lucide-react';
import { AboutUsContent } from './AboutUsContent';
import { LegalSheetModal } from './LegalSheetModal';

interface AboutUsModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ open, onClose }) => {
  return (
    <LegalSheetModal open={open} onClose={onClose} title="من نحن" icon={Store}>
      <AboutUsContent compact showHeader />
    </LegalSheetModal>
  );
};
