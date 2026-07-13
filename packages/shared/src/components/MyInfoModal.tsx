import React from 'react';
import { User } from 'lucide-react';
import { LegalSheetModal } from './LegalSheetModal';
import { MyInfoContent } from './MyInfoContent';

interface MyInfoModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
}

export const MyInfoModal: React.FC<MyInfoModalProps> = ({
  open,
  onClose,
  phone,
  name,
  onNameChange,
  onSave,
}) => {
  return (
    <LegalSheetModal open={open} onClose={onClose} title="معلوماتي" icon={User} variant="home">
      <MyInfoContent
        compact
        showHeader
        phone={phone}
        name={name}
        onNameChange={onNameChange}
        onSave={onSave}
      />
    </LegalSheetModal>
  );
};
