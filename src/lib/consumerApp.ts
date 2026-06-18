/** Admin dashboard is deployed separately — not bundled in the consumer app. */
export const ADMIN_DASHBOARD_URL = 'https://mahalak-admin.web.app';

export function openAdminDashboard(): void {
  window.open(ADMIN_DASHBOARD_URL, '_blank', 'noopener,noreferrer');
}
