import React from 'react';
import { FileText } from 'lucide-react';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { LegalSheetModal } from './LegalSheetModal';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ open, onClose }) => {
  return (
    <LegalSheetModal open={open} onClose={onClose} title="سياسة الخصوصية" icon={FileText}>
      <PrivacyPolicyContent compact showHeader />
    </LegalSheetModal>
  );
};
