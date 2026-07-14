import React from 'react';
import { Shield } from 'lucide-react';
import { ChangePasswordContent } from './ChangePasswordContent';
import { LegalSheetModal } from './LegalSheetModal';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  pwStep: 1 | 2;
  otpPwCode: string;
  newPassword: string;
  isSendingOtp?: boolean;
  isUpdatingPassword?: boolean;
  onOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onResendOtp?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
  phone,
  pwStep,
  otpPwCode,
  newPassword,
  isSendingOtp = false,
  isUpdatingPassword = false,
  onOtpChange,
  onNewPasswordChange,
  onSubmit,
  onResendOtp,
}) => {
  return (
    <LegalSheetModal open={open} onClose={onClose} title="تغيير كلمة المرور" icon={Shield} variant="home">
      <ChangePasswordContent
        compact
        showHeader
        phone={phone}
        pwStep={pwStep}
        otpPwCode={otpPwCode}
        newPassword={newPassword}
        isSendingOtp={isSendingOtp}
        isUpdatingPassword={isUpdatingPassword}
        onOtpChange={onOtpChange}
        onNewPasswordChange={onNewPasswordChange}
        onSubmit={onSubmit}
        onResendOtp={onResendOtp}
      />
    </LegalSheetModal>
  );
};
