import Swal from 'sweetalert2';

const TOAST_ICON_COLORS = {
  success: '#34d399',
  error: '#fb7185',
  warning: '#fbbf24',
  info: '#B18CFF',
} as const;

export type ToastIcon = keyof typeof TOAST_ICON_COLORS;

export const showToast = (icon: ToastIcon, title: string, text?: string) => {
  return Swal.fire({
    icon,
    title,
    text,
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    customClass: {
      container: 'swal2-mahalak-toast',
      popup: `swal2-mahalak-toast-popup swal2-mahalak-toast--${icon}`,
      title: 'swal2-mahalak-toast-title',
      htmlContainer: 'swal2-mahalak-toast-text',
      timerProgressBar: 'swal2-mahalak-toast-timer',
      icon: 'swal2-mahalak-toast-icon',
    },
    background: 'transparent',
    color: '#E8ECF4',
    iconColor: TOAST_ICON_COLORS[icon],
    showClass: {
      popup: 'swal2-mahalak-toast-in',
    },
    hideClass: {
      popup: 'swal2-mahalak-toast-out',
    },
  });
};

export const showConfirm = async (
  title: string,
  text: string,
  confirmButtonText: string = 'تأكيد',
  cancelButtonText: string = 'إلغاء',
) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#7B3DFF',
    cancelButtonColor: '#fb7185',
    customClass: {
      container: 'swal2-mahalak-modal',
      popup: 'swal2-mahalak-modal-popup',
      title: 'swal2-mahalak-modal-title',
      htmlContainer: 'swal2-mahalak-modal-text',
      confirmButton: 'swal2-mahalak-btn swal2-mahalak-btn--confirm',
      cancelButton: 'swal2-mahalak-btn swal2-mahalak-btn--cancel',
      actions: 'swal2-mahalak-modal-actions',
      icon: 'swal2-mahalak-modal-icon',
    },
    buttonsStyling: false,
    background: 'transparent',
    color: '#E8ECF4',
    iconColor: '#fbbf24',
    showClass: {
      popup: 'swal2-mahalak-modal-in',
    },
    hideClass: {
      popup: 'swal2-mahalak-modal-out',
    },
  });
};

export const showModal = (icon: ToastIcon, title: string, text?: string) => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#7B3DFF',
    customClass: {
      container: 'swal2-mahalak-modal',
      popup: 'swal2-mahalak-modal-popup',
      title: 'swal2-mahalak-modal-title',
      htmlContainer: 'swal2-mahalak-modal-text',
      confirmButton: 'swal2-mahalak-btn swal2-mahalak-btn--confirm',
      actions: 'swal2-mahalak-modal-actions',
      icon: 'swal2-mahalak-modal-icon',
    },
    buttonsStyling: false,
    background: 'transparent',
    color: '#E8ECF4',
    iconColor: TOAST_ICON_COLORS[icon],
    showClass: {
      popup: 'swal2-mahalak-modal-in',
    },
    hideClass: {
      popup: 'swal2-mahalak-modal-out',
    },
  });
};
