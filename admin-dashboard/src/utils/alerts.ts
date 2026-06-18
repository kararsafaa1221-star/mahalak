import Swal from 'sweetalert2';

export const showToast = (icon: 'success' | 'error' | 'warning' | 'info', title: string, text?: string) => {
  return Swal.fire({
    icon,
    title,
    text,
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'font-sans rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-4 mx-4 md:mx-auto',
      title: 'text-sm font-medium',
    },
    background: '#ffffff',
    color: '#0f172a', // slate-900
    iconColor: icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6',
    showClass: {
      popup: 'swal2-noanimation',
    },
    hideClass: {
      popup: '',
    }
  });
};

export const showConfirm = async (title: string, text: string, confirmButtonText: string = 'تأكيد', cancelButtonText: string = 'إلغاء') => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#ef4444',
    customClass: {
      popup: 'font-sans rounded-3xl shadow-2xl border border-slate-100',
      title: 'text-xl font-bold mt-2',
      htmlContainer: 'text-slate-500 text-sm mt-2',
      confirmButton: 'rounded-2xl px-8 py-3 font-semibold ml-2 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all text-white',
      cancelButton: 'rounded-2xl px-8 py-3 font-semibold bg-rose-50 hover:bg-rose-100 text-rose-500 focus:ring-4 focus:ring-rose-500/20 transition-all',
      actions: 'w-full px-6 pb-6 flex justify-center gap-3'
    },
    buttonsStyling: false,
    background: '#ffffff',
    color: '#0f172a',
    showClass: {
      popup: 'swal2-noanimation',
    },
    hideClass: {
      popup: '',
    }
  });
};
export const showModal = (icon: 'success' | 'error' | 'warning' | 'info', title: string, text?: string) => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#10b981',
    customClass: {
      popup: 'font-sans rounded-3xl shadow-2xl border border-slate-100',
      title: 'text-xl font-bold mt-2',
      htmlContainer: 'text-slate-500 text-sm mt-2',
      confirmButton: 'rounded-2xl px-8 py-3 font-semibold w-full mt-4 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all',
      actions: 'w-full px-6 pb-6'
    },
    buttonsStyling: false,
    background: '#ffffff',
    color: '#0f172a',
    showClass: {
      popup: 'swal2-noanimation',
    },
    hideClass: {
      popup: '',
    }
  });
};
