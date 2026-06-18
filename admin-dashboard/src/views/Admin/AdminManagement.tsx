import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Ban,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/useApp';
import { DASHBOARD_ADMIN_ROLES, type DashboardAdminRole } from '../../lib/adminAuth';
import {
  canAccessAdminManagement,
  canAssignOwnerRole,
  canDeleteAdminRecord,
  canModifyAdminRecord,
} from '../../lib/permissions';
import { mapCallableError } from '../../services/adminManagementService';
import { showConfirm, showToast } from '../../utils/alerts';
import type { Admin } from '../../types';

type ModalMode = 'create' | 'edit' | 'view' | null;

interface AdminFormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  province: string;
  area: string;
  role: DashboardAdminRole;
  status: 'active' | 'suspended';
}

const EMPTY_FORM: AdminFormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  province: '',
  area: '',
  role: 'admin',
  status: 'active',
};

const ROLE_META: Record<
  DashboardAdminRole,
  { label: string; description: string; badgeClass: string }
> = {
  owner: {
    label: 'Owner',
    description: 'المالك - كامل الصلاحيات',
    badgeClass: 'bg-[#f5eeff] text-[#4D2980] border-[#e9daff]',
  },
  admin: {
    label: 'Admin',
    description: 'مدير - إدارة كاملة',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  supervisor: {
    label: 'Supervisor',
    description: 'مشرف - متاجر وطلبات',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  accountant: {
    label: 'Accountant',
    description: 'محاسب - أرباح',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  support: {
    label: 'Support',
    description: 'دعم فني - طلبات وزبائن',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

function getInitials(admin: Admin): string {
  const source = admin.name?.trim() || admin.email?.trim() || admin.id;
  const parts = source.split(/\s+|@/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function isAdminActive(admin: Admin): boolean {
  return admin.status !== 'suspended' && admin.isSuspended !== true;
}

function adminToForm(admin: Admin): AdminFormState {
  return {
    name: admin.name ?? '',
    email: admin.email ?? '',
    password: '',
    phone: admin.phone ?? '',
    province: admin.province ?? '',
    area: admin.area ?? '',
    role: admin.role,
    status: isAdminActive(admin) ? 'active' : 'suspended',
  };
}

const ModalShell: React.FC<{
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, icon, onClose, children, footer }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-[#4D2980]/50 backdrop-blur-sm z-[960] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 pb-6 flex gap-3 justify-end">{footer}</div>}
    </motion.div>
  </motion.div>
);

export const AdminManagement: React.FC = () => {
  const {
    adminStaff,
    currentAdminDoc,
    adminUid,
    createAdminStaff,
    updateAdminStaff,
    updateAdminCredentials,
    toggleAdminStatus,
    deleteAdminStaff,
  } = useApp();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState<AdminFormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedStaff = useMemo(
    () =>
      [...adminStaff].sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return (a.name || a.email || '').localeCompare(b.name || b.email || '', 'ar');
      }),
    [adminStaff],
  );

  const assignableRoles = DASHBOARD_ADMIN_ROLES.filter(
    (role) => role !== 'owner' || canAssignOwnerRole(currentAdminDoc),
  );

  if (!canAccessAdminManagement(currentAdminDoc)) {
    return null;
  }

  const openCreateModal = () => {
    setSelectedAdmin(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setModalMode('create');
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setForm(adminToForm(admin));
    setShowPassword(false);
    setModalMode('edit');
  };

  const openViewModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setForm(adminToForm(admin));
    setModalMode('view');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedAdmin(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast('warning', 'يرجى تعبئة الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await createAdminStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        province: form.province.trim() || undefined,
        area: form.area.trim() || undefined,
        role: form.role,
      });
      showToast('success', 'تم إنشاء الحساب', 'تمت إضافة المدير بنجاح');
      closeModal();
    } catch (error) {
      showToast('error', 'فشل الإنشاء', mapCallableError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAdmin || !form.name.trim() || !form.email.trim()) {
      showToast('warning', 'يرجى تعبئة الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await updateAdminStaff(selectedAdmin.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        province: form.province.trim(),
        area: form.area.trim(),
        role: form.role,
        status: form.status,
        isSuspended: form.status === 'suspended',
      });
      if (form.password.trim()) {
        await updateAdminCredentials(selectedAdmin.id, {
          email: form.email.trim() !== selectedAdmin.email ? form.email.trim() : undefined,
          password: form.password,
        });
      } else if (form.email.trim() !== selectedAdmin.email) {
        await updateAdminCredentials(selectedAdmin.id, { email: form.email.trim() });
      }
      showToast('success', 'تم الحفظ', 'تم تحديث بيانات المدير');
      closeModal();
    } catch (error) {
      showToast('error', 'فشل التحديث', mapCallableError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (admin: Admin) => {
    if (admin.id === adminUid) {
      showToast('error', 'غير مسموح', 'لا يمكنك إيقاف حسابك الشخصي');
      return;
    }
    if (!canModifyAdminRecord(currentAdminDoc, admin, adminUid)) {
      showToast('error', 'غير مسموح', 'لا يمكنك إيقاف هذا الحساب');
      return;
    }
    const confirm = await showConfirm(
      'إيقاف مؤقت',
      `هل تريد إيقاف حساب ${admin.name || admin.email} مؤقتاً؟\nسيتم منعه من الدخول دون حذف بياناته.`,
      'إيقاف مؤقت',
    );
    if (!confirm.isConfirmed) return;
    try {
      await toggleAdminStatus(admin.id, false);
      showToast('success', 'تم الإيقاف', 'تم إيقاف الموظف مؤقتاً');
    } catch (error) {
      showToast('error', 'فشل الإيقاف', error instanceof Error ? error.message : 'حدث خطأ');
    }
  };

  const handleRestore = async (admin: Admin) => {
    if (!canModifyAdminRecord(currentAdminDoc, admin, adminUid)) {
      showToast('error', 'غير مسموح', 'لا يمكنك إرجاع هذا الحساب');
      return;
    }
    const confirm = await showConfirm(
      'إرجاع الموظف',
      `هل تريد إرجاع ${admin.name || admin.email} وتفعيل حسابه من جديد؟`,
      'إرجاع',
    );
    if (!confirm.isConfirmed) return;
    try {
      await toggleAdminStatus(admin.id, true);
      showToast('success', 'تم الإرجاع', 'تم تفعيل حساب الموظف بنجاح');
    } catch (error) {
      showToast('error', 'فشل الإرجاع', error instanceof Error ? error.message : 'حدث خطأ');
    }
  };

  const handlePermanentDelete = async (admin: Admin) => {
    if (!canDeleteAdminRecord(currentAdminDoc, admin)) {
      showToast('error', 'غير مسموح', 'لا يمكنك حذف هذا الحساب');
      return;
    }
    const confirm = await showConfirm(
      'حذف نهائي',
      `هل أنت متأكد من الحذف النهائي لـ ${admin.name || admin.email}؟\n\nسيتم حذف:\n• حساب الدخول (Firebase Auth)\n• بيانات المدير من قاعدة البيانات\n• الوصول إلى لوحة الإدارة\n\nلا يمكن التراجع عن هذا الإجراء.`,
      'حذف نهائي',
    );
    if (!confirm.isConfirmed) return;
    try {
      await deleteAdminStaff(admin.id);
      showToast('success', 'تم الحذف النهائي', 'تم حذف الحساب من النظام بالكامل');
    } catch (error) {
      showToast('error', 'فشل الحذف', mapCallableError(error));
    }
  };

  const renderRoleCards = (readOnly = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {assignableRoles.map((role) => {
        const meta = ROLE_META[role];
        const selected = form.role === role;
        return (
          <label
            key={role}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
              selected
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-slate-100 bg-white hover:border-slate-200'
            } ${readOnly ? 'pointer-events-none opacity-80' : ''}`}
          >
            <input
              type="radio"
              name="admin-role"
              value={role}
              checked={selected}
              disabled={readOnly}
              onChange={() => setForm((prev) => ({ ...prev, role }))}
              className="mt-1 accent-blue-500"
            />
            <div>
              <p className="font-black text-slate-800">{meta.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
            </div>
          </label>
        );
      })}
    </div>
  );

  const renderFormFields = (mode: 'create' | 'edit' | 'view') => {
    const readOnly = mode === 'view';
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <User size={14} /> الاسم الكامل
            </label>
            <input
              type="text"
              value={form.name}
              readOnly={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: أحمد محمد"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <Mail size={14} /> البريد الإلكتروني
            </label>
            <input
              type="email"
              value={form.email}
              readOnly={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="admin@domain.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <Phone size={14} /> رقم الهاتف
            </label>
            <input
              type="tel"
              value={form.phone}
              readOnly={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="0790000000"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <Lock size={14} /> كلمة المرور
              {mode === 'edit' && (
                <span className="text-[10px] font-normal text-slate-400 mr-1">
                  (اتركه فارغاً إذا لم ترد تغييره)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                readOnly={readOnly}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder={mode === 'create' ? '••••••••' : ''}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pl-10 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <MapPin size={14} /> المحافظة
            </label>
            <input
              type="text"
              value={form.province}
              readOnly={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
              placeholder="مثال: بغداد"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1.5">
              <MapPin size={14} /> المنطقة
            </label>
            <input
              type="text"
              value={form.area}
              readOnly={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
              placeholder="مثال: المنصور"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-slate-700 mb-3">الدور والصلاحيات</p>
          {renderRoleCards(readOnly)}
        </div>

        {mode === 'edit' && (
          <div>
            <p className="text-sm font-black text-slate-700 mb-3">حالة الحساب</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="admin-status"
                  checked={form.status === 'active'}
                  onChange={() => setForm((p) => ({ ...p, status: 'active' }))}
                  className="accent-blue-500"
                />
                نشط
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="admin-status"
                  checked={form.status === 'suspended'}
                  onChange={() => setForm((p) => ({ ...p, status: 'suspended' }))}
                  className="accent-blue-500"
                />
                موقوف (يمنع من الدخول)
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <Shield size={22} className="text-[#9952FF]" />
              إدارة المدراء (Admins)
            </h3>
            <p className="text-xs text-slate-500 mt-1">جلسة إدارية نشطة — إدارة حسابات لوحة التحكم</p>
          </div>
          {canAccessAdminManagement(currentAdminDoc) && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#9952FF] hover:bg-[#8642ef] text-white font-bold text-sm shadow-md transition"
            >
              <Plus size={18} />
              إنشاء حساب جديد
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">المدير</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">موقع العمل</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    لا يوجد مدراء مسجلون حالياً.
                  </td>
                </tr>
              ) : (
                sortedStaff.map((admin) => {
                  const active = isAdminActive(admin);
                  const isSelf = admin.id === adminUid;
                  const canModify = canModifyAdminRecord(currentAdminDoc, admin, adminUid);
                  const canDelete = canDeleteAdminRecord(currentAdminDoc, admin);
                  const meta = ROLE_META[admin.role];
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[#f5eeff] text-[#4D2980] font-black flex items-center justify-center text-xs">
                              {getInitials(admin)}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                active ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{admin.name || '—'}</p>
                            <p className="text-xs text-slate-500">{admin.email || admin.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {admin.province ? `${admin.province}${admin.area ? ` - ${admin.area}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}
                        >
                          {active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(admin)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition text-[11px] font-bold"
                            title="عرض"
                          >
                            <Eye size={14} />
                            عرض
                          </button>
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => openEditModal(admin)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition text-[11px] font-bold"
                              title="تعديل"
                            >
                              <Edit size={14} />
                              تعديل
                            </button>
                          )}
                          {canModify && active && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleSuspend(admin)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition text-[11px] font-bold"
                              title="إيقاف مؤقت"
                            >
                              <Ban size={14} />
                              إيقاف مؤقت
                            </button>
                          )}
                          {canModify && !active && (
                            <button
                              type="button"
                              onClick={() => handleRestore(admin)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition text-[11px] font-bold"
                              title="إرجاع الموظف"
                            >
                              <UserCheck size={14} />
                              إرجاع
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(admin)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition text-[11px] font-bold"
                              title="حذف نهائي"
                            >
                              <Trash2 size={14} />
                              حذف نهائي
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalMode === 'create' && (
          <ModalShell
            title="إنشاء حساب مدير"
            icon={<Plus size={18} className="text-[#9952FF]" />}
            onClose={closeModal}
            footer={
              <>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#9952FF] text-white font-bold hover:bg-[#8642ef] disabled:opacity-50 transition"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
              </>
            }
          >
            {renderFormFields('create')}
          </ModalShell>
        )}

        {modalMode === 'edit' && selectedAdmin && (
          <ModalShell
            title="تعديل بيانات المدير"
            icon={<Edit size={18} className="text-[#9952FF]" />}
            onClose={closeModal}
            footer={
              <>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#9952FF] text-white font-bold hover:bg-[#8642ef] disabled:opacity-50 transition"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
              </>
            }
          >
            {renderFormFields('edit')}
          </ModalShell>
        )}

        {modalMode === 'view' && selectedAdmin && (
          <ModalShell
            title="تفاصيل المدير"
            icon={<Eye size={18} className="text-[#9952FF]" />}
            onClose={closeModal}
            footer={
              canModifyAdminRecord(currentAdminDoc, selectedAdmin, adminUid) ? (
                <button
                  type="button"
                  onClick={() => setModalMode('edit')}
                  className="px-6 py-2.5 rounded-xl bg-[#9952FF] text-white font-bold hover:bg-[#8642ef] transition"
                >
                  تعديل
                </button>
              ) : undefined
            }
          >
            {renderFormFields('view')}
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};
