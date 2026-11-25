import React from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LegalSheetModal } from './LegalSheetModal';
import { MyInfoContent } from './MyInfoContent';

interface MyInfoModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  name: string;
  isSaving?: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
}

export const MyInfoModal: React.FC<MyInfoModalProps> = ({
  open,
  onClose,
  phone,
  name,
  isSaving = false,
  onNameChange,
  onSave,
}) => {
  const { t } = useTranslation();
  return (
    <LegalSheetModal open={open} onClose={onClose} title={t('profile.myInfo.title')} icon={User} variant="home">
      <MyInfoContent
        compact
        showHeader
        phone={phone}
        name={name}
        isSaving={isSaving}
        onNameChange={onNameChange}
        onSave={onSave}
      />
    </LegalSheetModal>
  );
};
