import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Ban,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Settings2,
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
  capPermissionsToActor,
  getRoleDefaultPages,
  hasPermission,
  isBuiltInRole,
  PAGE_KEYS,
  PAGE_KEY_LABELS_AR,
  resolvePermissions,
  type CustomRoleDef,
  type PageKey,
} from '../../lib/permissions';
import { mapCallableError } from '../../services/adminManagementService';
import { showConfirm, showToast } from '../../utils/alerts';
import { ImageUploader } from '../../components/ImageUploader';
import type { Admin } from '../../types';

/** Presence is considered stale — and shown as offline — once the heartbeat is older than this. */
const PRESENCE_STALE_MS = 90_000;

function isEffectivelyOnline(admin: Admin, nowMs: number): boolean {
  if (!admin.isOnline || !admin.lastActiveAt) return false;
  const lastActiveMs = new Date(admin.lastActiveAt).getTime();
  if (Number.isNaN(lastActiveMs)) return false;
  return nowMs - lastActiveMs < PRESENCE_STALE_MS;
}

function formatLastSeen(admin: Admin): string {
  if (!admin.lastActiveAt) return 'لم يسجل الدخول من قبل';
  const lastActiveMs = new Date(admin.lastActiveAt).getTime();
  if (Number.isNaN(lastActiveMs)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - lastActiveMs) / 1000));
  if (diffSec < 60) return 'قبل لحظات';
  if (diffSec < 3600) return `قبل ${Math.floor(diffSec / 60)} دقيقة`;
  if (diffSec < 86400) return `قبل ${Math.floor(diffSec / 3600)} ساعة`;
  return `قبل ${Math.floor(diffSec / 86400)} يوم`;
}

type ModalMode = 'create' | 'edit' | 'view' | null;

interface AdminFormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  province: string;
  area: string;
  /** One of the 5 built-in roles, or a custom role id (settings/global.customRoles). */
  role: string;
  status: 'active' | 'suspended';
  photoUrl: string;
  isTimeRestricted: boolean;
  workStartTime: string;
  workEndTime: string;
  /** Explicit per-employee page access override. Empty = use the role's default pages. */
  customPermissions: PageKey[];
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
  photoUrl: '',
  isTimeRestricted: false,
  workStartTime: '09:00',
  workEndTime: '17:00',
  customPermissions: [],
};

interface RoleMeta {
  label: string;
  description: string;
  badgeClass: string;
  isCustom?: boolean;
}

const CUSTOM_ROLE_BADGE_CLASS = 'bg-teal-50 text-teal-700 border-teal-100';

/** Fallback label/description shown until the owner customizes them (see roleLabels in settings/global). */
const DEFAULT_ROLE_META: Record<DashboardAdminRole, RoleMeta> = {
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

type RoleLabelsOverride = Partial<Record<DashboardAdminRole, { label?: string; description?: string }>>;

/** Merges the owner's custom role name/description (stored in settings/global.roleLabels) over the defaults. */
function buildRoleMeta(overrides: RoleLabelsOverride | undefined): Record<DashboardAdminRole, RoleMeta> {
  const merged = {} as Record<DashboardAdminRole, RoleMeta>;
  for (const role of DASHBOARD_ADMIN_ROLES) {
    const base = DEFAULT_ROLE_META[role];
    const override = overrides?.[role];
    merged[role] = {
      badgeClass: base.badgeClass,
      label: override?.label?.trim() || base.label,
      description: override?.description?.trim() || base.description,
    };
  }
  return merged;
}

/** Extends the 5 built-in roles with any owner-defined custom roles (settings/global.customRoles) for display/selection everywhere role metadata is looked up. */
function buildFullRoleMeta(
  builtIn: Record<DashboardAdminRole, RoleMeta>,
  customRoles: CustomRoleDef[],
): Record<string, RoleMeta> {
  const merged: Record<string, RoleMeta> = { ...builtIn };
  for (const role of customRoles) {
    merged[role.id] = {
      label: role.label,
      description: role.description || 'دور مخصص',
      badgeClass: CUSTOM_ROLE_BADGE_CLASS,
      isCustom: true,
    };
  }
  return merged;
}

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
    photoUrl: admin.photoUrl ?? '',
    isTimeRestricted: admin.isTimeRestricted === true,
    workStartTime: admin.workStartTime || '09:00',
    workEndTime: admin.workEndTime || '17:00',
    customPermissions: (admin.rawPermissions ?? []).filter((p): p is PageKey =>
      (PAGE_KEYS as readonly string[]).includes(p),
    ),
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
    adminSettings,
    updateAdminSettings,
  } = useApp();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState<AdminFormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [showRoleLabelsModal, setShowRoleLabelsModal] = useState(false);
  const [roleLabelsForm, setRoleLabelsForm] = useState<RoleLabelsOverride>({});
  const [savingRoleLabels, setSavingRoleLabels] = useState(false);
  const [customRoleDraft, setCustomRoleDraft] = useState<{
    id: string | null;
    label: string;
    description: string;
    permissions: PageKey[];
  } | null>(null);
  const [savingCustomRole, setSavingCustomRole] = useState(false);

  const customRoles: CustomRoleDef[] = useMemo(
    () => (Array.isArray(adminSettings?.customRoles) ? adminSettings.customRoles : []),
    [adminSettings?.customRoles],
  );

  const builtInRoleMeta = useMemo(
    () => buildRoleMeta(adminSettings?.roleLabels as RoleLabelsOverride | undefined),
    [adminSettings?.roleLabels],
  );

  const roleMeta = useMemo(
    () => buildFullRoleMeta(builtInRoleMeta, customRoles),
    [builtInRoleMeta, customRoles],
  );

  // Ticks the clock so the online/offline presence badges and "last seen" text
  // stay fresh without requiring a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const sortedStaff = useMemo(
    () =>
      [...adminStaff].sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return (a.name || a.email || '').localeCompare(b.name || b.email || '', 'ar');
      }),
    [adminStaff],
  );

  const assignableRoles: string[] = useMemo(
    () => [
      ...DASHBOARD_ADMIN_ROLES.filter((role) => role !== 'owner' || canAssignOwnerRole(currentAdminDoc)),
      ...customRoles.map((role) => role.id),
    ],
    [currentAdminDoc, customRoles],
  );

  // The pages the acting admin can themself access — nobody here can grant
  // another employee a page they don't have access to. Owner is exempt
  // (always full access).
  const actorIsOwner = currentAdminDoc?.role === 'owner';
  const actorPages = useMemo(
    () => (actorIsOwner ? [...PAGE_KEYS] : resolvePermissions(currentAdminDoc)),
    [actorIsOwner, currentAdminDoc],
  );

  // Role display names/descriptions live in settings/global (write-gated to
  // whoever can access the "settings" page — see firestore.rules).
  const canEditRoleLabels = actorIsOwner || hasPermission(currentAdminDoc, 'settings');

  if (!canAccessAdminManagement(currentAdminDoc)) {
    return null;
  }

  const openCreateModal = () => {
    setSelectedAdmin(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setModalMode('create');
  };

  const openRoleLabelsModal = () => {
    const seeded = {} as RoleLabelsOverride;
    for (const role of DASHBOARD_ADMIN_ROLES) {
      seeded[role] = { label: roleMeta[role].label, description: roleMeta[role].description };
    }
    setRoleLabelsForm(seeded);
    setCustomRoleDraft(null);
    setShowRoleLabelsModal(true);
  };

  const handleSaveRoleLabels = async () => {
    setSavingRoleLabels(true);
    try {
      const cleaned: RoleLabelsOverride = {};
      for (const role of DASHBOARD_ADMIN_ROLES) {
        const entry = roleLabelsForm[role];
        cleaned[role] = {
          label: entry?.label?.trim() || DEFAULT_ROLE_META[role].label,
          description: entry?.description?.trim() || DEFAULT_ROLE_META[role].description,
        };
      }
      await updateAdminSettings({ roleLabels: cleaned });
      showToast('success', 'تم الحفظ', 'تم تحديث أسماء ووصف الأدوار');
      setShowRoleLabelsModal(false);
    } catch (e) {
      showToast('error', 'فشل الحفظ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setSavingRoleLabels(false);
    }
  };

  const openAddCustomRole = () => {
    setCustomRoleDraft({ id: null, label: '', description: '', permissions: [] });
  };

  const openEditCustomRole = (role: CustomRoleDef) => {
    setCustomRoleDraft({ id: role.id, label: role.label, description: role.description, permissions: [...role.permissions] });
  };

  const cancelCustomRoleDraft = () => setCustomRoleDraft(null);

  const toggleDraftPage = (key: PageKey) => {
    if (!actorIsOwner && !actorPages.includes(key)) return;
    setCustomRoleDraft((draft) => {
      if (!draft) return draft;
      const next = draft.permissions.includes(key)
        ? draft.permissions.filter((k) => k !== key)
        : [...draft.permissions, key];
      return { ...draft, permissions: next };
    });
  };

  const slugifyRoleLabel = (label: string, existingIds: string[]): string => {
    const reserved = new Set(DASHBOARD_ADMIN_ROLES as readonly string[]);
    const base =
      label
        .trim()
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'role';
    let candidate = reserved.has(base) ? `${base}_role` : base;
    let n = 2;
    while (existingIds.includes(candidate)) {
      candidate = `${base}_${n}`;
      n += 1;
    }
    return candidate;
  };

  const handleSaveCustomRole = async () => {
    if (!customRoleDraft) return;
    const label = customRoleDraft.label.trim();
    if (!label) {
      showToast('warning', 'يرجى إدخال اسم الدور');
      return;
    }
    // Nobody with adminManagement access can define a role that reaches
    // pages they don't themself have access to — owner is exempt.
    const cappedPermissions = capPermissionsToActor(currentAdminDoc, customRoleDraft.permissions);
    if (cappedPermissions.length === 0) {
      showToast('warning', 'يرجى تحديد صفحة واحدة على الأقل لهذا الدور');
      return;
    }
    setSavingCustomRole(true);
    try {
      const isEdit = !!customRoleDraft.id;
      const id = customRoleDraft.id ?? slugifyRoleLabel(label, customRoles.map((r) => r.id));
      const nextRoles: CustomRoleDef[] = isEdit
        ? customRoles.map((r) =>
            r.id === id ? { id, label, description: customRoleDraft.description.trim(), permissions: cappedPermissions } : r,
          )
        : [...customRoles, { id, label, description: customRoleDraft.description.trim(), permissions: cappedPermissions }];
      await updateAdminSettings({ customRoles: nextRoles });
      showToast('success', 'تم الحفظ', isEdit ? 'تم تحديث الدور المخصص' : 'تم إضافة الدور المخصص');
      setCustomRoleDraft(null);
    } catch (e) {
      showToast('error', 'فشل الحفظ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setSavingCustomRole(false);
    }
  };

  const handleDeleteCustomRole = async (role: CustomRoleDef) => {
    const assignedCount = adminStaff.filter((a) => a.role === role.id).length;
    if (assignedCount > 0) {
      showToast('warning', 'لا يمكن الحذف', `يوجد ${assignedCount} موظف مسجل بهذا الدور حالياً. غيّر دورهم أولاً.`);
      return;
    }
    const confirm = await showConfirm('حذف الدور', `هل تريد حذف الدور "${role.label}"؟`, 'حذف');
    if (!confirm.isConfirmed) return;
    try {
      await updateAdminSettings({ customRoles: customRoles.filter((r) => r.id !== role.id) });
      showToast('success', 'تم الحذف', 'تم حذف الدور المخصص');
    } catch (e) {
      showToast('error', 'فشل الحذف', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
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

  // Empty customPermissions means "use the role's default pages" — for
  // built-in roles that's resolved dynamically at read-time (resolvePermissions
  // falls back to ROLE_PERMISSION_MATRIX), but custom roles have no matrix
  // row, so we must fork their default set explicitly at submit time or the
  // employee would end up with zero pages.
  const resolveSubmissionPermissions = (state: AdminFormState): PageKey[] => {
    const base = state.customPermissions.length > 0 ? state.customPermissions : getRoleDefaultPages(state.role, customRoles);
    return capPermissionsToActor(currentAdminDoc, base);
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
        photoUrl: form.photoUrl || undefined,
        ...(form.role !== 'owner'
          ? {
              isTimeRestricted: form.isTimeRestricted,
              workStartTime: form.workStartTime,
              workEndTime: form.workEndTime,
              permissions: resolveSubmissionPermissions(form),
            }
          : {}),
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
        photoUrl: form.photoUrl,
        isTimeRestricted: form.isTimeRestricted,
        workStartTime: form.workStartTime,
        workEndTime: form.workEndTime,
        permissions: form.role !== 'owner' ? resolveSubmissionPermissions(form) : undefined,
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

  const togglePagePermission = (key: PageKey) => {
    if (!actorIsOwner && !actorPages.includes(key)) return; // can't grant a page you don't have yourself
    setForm((p) => {
      // Forks from the role's default page set the first time a checkbox is
      // toggled, so the grid always reflects what's actually checked.
      const base = p.customPermissions.length > 0 ? p.customPermissions : getRoleDefaultPages(p.role, customRoles);
      const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
      return { ...p, customPermissions: next };
    });
  };

  const renderPageAccessSection = (mode: 'create' | 'edit' | 'view') => {
    const readOnly = mode === 'view';
    const roleDefaults = getRoleDefaultPages(form.role, customRoles);
    const isCustomized = form.customPermissions.length > 0;
    const activePages = isCustomized ? form.customPermissions : roleDefaults;
    const currentRoleLabel = roleMeta[form.role]?.label ?? form.role;

    if (readOnly) {
      return (
        <div>
          <p className="text-sm font-black text-slate-700 mb-2">الوصول إلى الصفحات</p>
          <p className="text-[11px] text-slate-400 font-bold mb-3">
            {isCustomized
              ? 'صلاحيات مخصصة لهذا الموظف — مستقلة عن الصفحات الافتراضية لدوره:'
              : `يستخدم الصفحات الافتراضية لدور "${currentRoleLabel}":`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activePages.length === 0 ? (
              <span className="text-xs text-slate-400">لا توجد صفحات متاحة</span>
            ) : (
              activePages.map((key) => (
                <span
                  key={key}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100"
                >
                  {PAGE_KEY_LABELS_AR[key]}
                </span>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-sm font-black text-slate-700">الوصول إلى الصفحات</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, customPermissions: actorIsOwner ? [...PAGE_KEYS] : actorPages }))}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              {actorIsOwner ? 'تحديد كل الصفحات' : 'تحديد كل صفحاتي المتاحة'}
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  // Built-in roles fall back to the matrix dynamically when left
                  // empty; custom roles have no matrix row, so re-fork their
                  // default set explicitly instead of clearing to [].
                  customPermissions: isBuiltInRole(p.role) ? [] : getRoleDefaultPages(p.role, customRoles),
                }))
              }
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              استخدام صلاحيات الدور الافتراضية
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-bold mb-3">
          {isCustomized
            ? 'تم تخصيص صفحات مستقلة عن الدور — الوصول محدد بالصفحات المحددة أدناه فقط.'
            : `اترك التحديد فارغاً لاستخدام الصفحات الافتراضية لدور "${currentRoleLabel}"، أو حدد صفحات معينة لمنح/تقييد وصول هذا الموظف بشكل مستقل عن دوره.`}
        </p>
        {!actorIsOwner && (
          <p className="text-[11px] text-amber-600 font-bold mb-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            لا يمكنك منح صفحات لا تملك أنت صلاحية الوصول إليها — الصفحات المعطّلة أدناه غير متاحة لحسابك.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
          {PAGE_KEYS.map((key) => {
            const checked = isCustomized ? form.customPermissions.includes(key) : roleDefaults.includes(key);
            const grantable = actorIsOwner || actorPages.includes(key);
            return (
              <label
                key={key}
                title={grantable ? undefined : 'ليس لديك صلاحية الوصول لهذه الصفحة، لا يمكنك منحها لغيرك'}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                  !grantable
                    ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                    : checked
                      ? 'bg-blue-50 text-blue-700 border border-blue-100 cursor-pointer'
                      : 'bg-white text-slate-500 border border-slate-100 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked && grantable}
                  disabled={!grantable}
                  onChange={() => togglePagePermission(key)}
                  className="w-3.5 h-3.5 accent-blue-500 disabled:cursor-not-allowed"
                />
                {PAGE_KEY_LABELS_AR[key]}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRoleCards = (readOnly = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {assignableRoles.map((role) => {
        const meta = roleMeta[role] ?? { label: role, description: '', badgeClass: '', isCustom: true };
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
              onChange={() =>
                setForm((prev) => ({
                  ...prev,
                  role,
                  // Custom roles have no default-page matrix row, so seed their
                  // page-access grid from the role's own saved default set —
                  // otherwise the employee would end up with zero pages.
                  customPermissions: isBuiltInRole(role) ? [] : getRoleDefaultPages(role, customRoles),
                }))
              }
              className="mt-1 accent-blue-500"
            />
            <div>
              <p className="font-black text-slate-800 flex items-center gap-1.5">
                {meta.label}
                {meta.isCustom && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
                    مخصص
                  </span>
                )}
              </p>
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
        {form.role !== 'owner' && (
          <div className="max-w-[140px]">
            {readOnly ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الصورة الشخصية</label>
                <div className="w-[110px] h-[110px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt={form.name || 'صورة الموظف'} className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-slate-300" />
                  )}
                </div>
              </div>
            ) : (
              <ImageUploader
                value={form.photoUrl}
                onChange={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
                label="الصورة الشخصية"
                placeholder="إضافة صورة"
                aspectRatio="square"
                maxSizeMB={5}
              />
            )}
          </div>
        )}
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

        {form.role !== 'owner' && renderPageAccessSection(mode)}

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

        {mode === 'view' && selectedAdmin && selectedAdmin.role !== 'owner' && (
          <div>
            <p className="text-sm font-black text-slate-700 mb-3">الحالة الآن</p>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isEffectivelyOnline(selectedAdmin, nowTick) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              <span className={isEffectivelyOnline(selectedAdmin, nowTick) ? 'text-emerald-700' : 'text-slate-500'}>
                {isEffectivelyOnline(selectedAdmin, nowTick) ? 'متصل الآن' : `غير متصل — ${formatLastSeen(selectedAdmin)}`}
              </span>
            </div>
          </div>
        )}

        {form.role !== 'owner' && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-black text-slate-700 mb-3">
              <Clock size={16} /> تقييد ساعات الدخول
            </p>
            {readOnly ? (
              form.isTimeRestricted ? (
                <p className="text-sm text-slate-600 font-bold">
                  مسموح بالدخول فقط من الساعة <span className="text-slate-900">{form.workStartTime}</span> إلى الساعة{' '}
                  <span className="text-slate-900">{form.workEndTime}</span>. يتم تسجيل خروجه تلقائياً خارج هذا النطاق.
                </p>
              ) : (
                <p className="text-sm text-slate-400 font-bold">غير مُفعّل — يمكنه الدخول في أي وقت.</p>
              )
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isTimeRestricted}
                    onChange={(e) => setForm((p) => ({ ...p, isTimeRestricted: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500"
                  />
                  تفعيل تقييد ساعات الدخول لهذا الموظف
                </label>
                {form.isTimeRestricted && (
                  <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">من الساعة</label>
                      <input
                        type="time"
                        value={form.workStartTime}
                        onChange={(e) => setForm((p) => ({ ...p, workStartTime: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">إلى الساعة</label>
                      <input
                        type="time"
                        value={form.workEndTime}
                        onChange={(e) => setForm((p) => ({ ...p, workEndTime: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                  عند التفعيل، لا يمكن للموظف تسجيل الدخول خارج هذا النطاق الزمني، وسيتم تسجيل خروجه تلقائياً إذا كان
                  متصلاً وتجاوز الوقت المسموح.
                </p>
              </div>
            )}
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
          <div className="flex items-center gap-2">
            {canEditRoleLabels && (
              <button
                type="button"
                onClick={openRoleLabelsModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
              >
                <Settings2 size={16} />
                إدارة الأدوار
              </button>
            )}
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">المدير</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">موقع العمل</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">متصل الآن</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    لا يوجد مدراء مسجلون حالياً.
                  </td>
                </tr>
              ) : (
                sortedStaff.map((admin) => {
                  const active = isAdminActive(admin);
                  const isSelf = admin.id === adminUid;
                  const canModify = canModifyAdminRecord(currentAdminDoc, admin, adminUid);
                  const canDelete = canDeleteAdminRecord(currentAdminDoc, admin);
                  const meta = roleMeta[admin.role] ?? { label: admin.role, description: '', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {admin.photoUrl ? (
                              <img
                                src={admin.photoUrl}
                                alt={admin.name || admin.email || admin.id}
                                className="w-10 h-10 rounded-full object-cover border border-slate-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#f5eeff] text-[#4D2980] font-black flex items-center justify-center text-xs">
                                {getInitials(admin)}
                              </div>
                            )}
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
                        {admin.role === 'owner' ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isEffectivelyOnline(admin, nowTick) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                              }`}
                            />
                            <span className={`text-xs font-bold ${isEffectivelyOnline(admin, nowTick) ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {isEffectivelyOnline(admin, nowTick) ? 'متصل' : formatLastSeen(admin)}
                            </span>
                            {admin.isTimeRestricted && (
                              <span title="مقيّد بساعات دخول" className="text-amber-500">
                                <Clock size={12} />
                              </span>
                            )}
                          </div>
                        )}
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

        {showRoleLabelsModal && (
          <ModalShell
            title="إدارة الأدوار"
            icon={<Settings2 size={18} className="text-[#9952FF]" />}
            onClose={() => setShowRoleLabelsModal(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setShowRoleLabelsModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoleLabels}
                  disabled={savingRoleLabels}
                  className="px-6 py-2.5 rounded-xl bg-[#9952FF] text-white font-bold hover:bg-[#8642ef] disabled:opacity-50 transition"
                >
                  {savingRoleLabels ? 'جاري الحفظ...' : 'حفظ أسماء الأدوار الأساسية'}
                </button>
              </>
            }
          >
            <div className="mb-8">
              <p className="text-sm font-black text-slate-700 mb-1">الأدوار الأساسية</p>
              <p className="text-xs text-slate-500 mb-4">
                هذه الأسماء والأوصاف تظهر في بطاقات الأدوار وجدول الموظفين. دور الموظف الفعلي (وصلاحياته) لا يتغير — هذا فقط تخصيص للعرض.
              </p>
              <div className="space-y-4">
                {DASHBOARD_ADMIN_ROLES.map((role) => (
                  <div key={role} className="border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-400 mb-2">
                      الدور الأساسي: {DEFAULT_ROLE_META[role].label}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم المعروض</label>
                        <input
                          type="text"
                          value={roleLabelsForm[role]?.label ?? ''}
                          onChange={(e) =>
                            setRoleLabelsForm((p) => ({ ...p, [role]: { ...p[role], label: e.target.value } }))
                          }
                          placeholder={DEFAULT_ROLE_META[role].label}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف</label>
                        <input
                          type="text"
                          value={roleLabelsForm[role]?.description ?? ''}
                          onChange={(e) =>
                            setRoleLabelsForm((p) => ({ ...p, [role]: { ...p[role], description: e.target.value } }))
                          }
                          placeholder={DEFAULT_ROLE_META[role].description}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-black text-slate-700">الأدوار المخصصة</p>
                {!customRoleDraft && (
                  <button
                    type="button"
                    onClick={openAddCustomRole}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#9952FF]/10 hover:bg-[#9952FF]/20 text-[#4D2980] transition"
                  >
                    <Plus size={13} /> إضافة دور جديد
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                أدوار إضافية بأسماء وصفحات وصول خاصة بك، تظهر جنباً إلى جنب مع الأدوار الأساسية عند إنشاء أو تعديل موظف.
              </p>

              {customRoles.length === 0 && !customRoleDraft && (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد أدوار مخصصة بعد.</p>
              )}

              {!customRoleDraft && customRoles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {customRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3"
                    >
                      <div>
                        <p className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                          {role.label}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
                            مخصص
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {role.description || 'بلا وصف'} — {role.permissions.length} صفحة
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditCustomRole(role)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                          aria-label="تعديل"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomRole(role)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
                          aria-label="حذف"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {customRoleDraft && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                  <p className="text-sm font-black text-slate-700 mb-3">
                    {customRoleDraft.id ? 'تعديل الدور المخصص' : 'دور مخصص جديد'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الدور</label>
                      <input
                        type="text"
                        value={customRoleDraft.label}
                        onChange={(e) =>
                          setCustomRoleDraft((d) => (d ? { ...d, label: e.target.value } : d))
                        }
                        placeholder="مثال: التسويق"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف</label>
                      <input
                        type="text"
                        value={customRoleDraft.description}
                        onChange={(e) =>
                          setCustomRoleDraft((d) => (d ? { ...d, description: e.target.value } : d))
                        }
                        placeholder="مثال: فريق التسويق - إعلانات وعروض"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#9952FF]/30 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-2">الصفحات الافتراضية لهذا الدور</p>
                  {!actorIsOwner && (
                    <p className="text-[11px] text-amber-600 font-bold mb-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      لا يمكنك منح صفحات لا تملك أنت صلاحية الوصول إليها.
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-white mb-4">
                    {PAGE_KEYS.map((key) => {
                      const checked = customRoleDraft.permissions.includes(key);
                      const grantable = actorIsOwner || actorPages.includes(key);
                      return (
                        <label
                          key={key}
                          title={grantable ? undefined : 'ليس لديك صلاحية الوصول لهذه الصفحة'}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                            !grantable
                              ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                              : checked
                                ? 'bg-blue-50 text-blue-700 border border-blue-100 cursor-pointer'
                                : 'bg-white text-slate-500 border border-slate-100 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked && grantable}
                            disabled={!grantable}
                            onChange={() => toggleDraftPage(key)}
                            className="w-3.5 h-3.5 accent-blue-500 disabled:cursor-not-allowed"
                          />
                          {PAGE_KEY_LABELS_AR[key]}
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelCustomRoleDraft}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomRole}
                      disabled={savingCustomRole}
                      className="px-4 py-2 rounded-xl bg-[#9952FF] text-white font-bold text-sm hover:bg-[#8642ef] disabled:opacity-50 transition"
                    >
                      {savingCustomRole ? 'جاري الحفظ...' : 'حفظ الدور'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};
