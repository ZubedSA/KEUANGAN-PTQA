import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Keuangan from './pages/Keuangan';
import Santri from './pages/Santri';
import Tools from './pages/Tools';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Penyaluran from './pages/Penyaluran';
import Notifikasi from './pages/Notifikasi';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Admin Route Component
function AdminRoute({ children }) {
  const { isAdmin, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />

        {/* Keuangan Route with Submenu Logic */}
        <Route path="keuangan" element={<Navigate to="/keuangan/pemasukan" replace />} />
        <Route path="keuangan/:tab" element={<Keuangan />} />

        {/* Santri Route with Submenu Logic */}
        <Route path="santri" element={<Navigate to="/santri/data" replace />} />
        <Route path="santri/:tab" element={<Santri />} />

        {/* Penyaluran Dana Route */}
        <Route path="penyaluran" element={<Navigate to="/penyaluran/anggaran" replace />} />
        <Route path="penyaluran/:tab" element={<Penyaluran />} />

        <Route path="tools" element={<Tools />} />

        {/* Admin Only Route */}
        <Route path="users" element={
          <AdminRoute>
            <UserManagement />
          </AdminRoute>
        } />

        {/* Notification History */}
        <Route path="notifikasi" element={<Notifikasi />} />

        {/* Catch-all route for unmatched paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Global catch-all for any unmatched paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
