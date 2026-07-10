import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { useApp } from './context/useApp';
import { AdminPanel } from './views/Admin/AdminPanel';
import { AdminLogin } from './views/AdminLogin';
import { Unauthorized } from './views/Unauthorized';
import { RequireAuth } from './components/RequireAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getFirstAllowedPageKey } from './lib/permissions';

const DashboardIndexRedirect: React.FC = () => {
  const { currentAdminDoc } = useApp();
  const fallback = getFirstAllowedPageKey(currentAdminDoc) ?? 'stores';
  return <Navigate to={`/dashboard/${fallback}`} replace />;
};

const AppRoutes: React.FC = () => {
  const { currentAdmin } = useApp();

  return (
    <Routes>
      <Route
        path="/login"
        element={currentAdmin ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardIndexRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/:pageKey"
        element={
          <RequireAuth>
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          </RequireAuth>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <RequireAuth>
            <Unauthorized />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={<Navigate to={currentAdmin ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={currentAdmin ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <HashRouter>
      <AdminProvider>
        <AppRoutes />
      </AdminProvider>
    </HashRouter>
  );
}

export default App;
