import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/student/ReportIssuePage';
import { MyComplaintsPage } from './pages/student/MyComplaintsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ApprovalQueuePage } from './pages/authority/ApprovalQueuePage';
import { MaintenanceDetailPage } from './pages/authority/MaintenanceDetailPage';
import { FacilitiesOverviewPage } from './pages/authority/FacilitiesOverviewPage';
import { TechniciansListPage } from './pages/authority/TechniciansListPage';
import { ProviderDashboardPage } from './pages/provider/ProviderDashboardPage';
import { PrincipalAnalyticsPage } from './pages/principal/PrincipalAnalyticsPage';
import { PrincipalReportsPage } from './pages/principal/PrincipalReportsPage';

// Central Dashboard Resolver: Routes authenticated user strictly to THEIR authorized portal
const DashboardRedirect = () => {
  const { user, token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0f6fb0] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'authority') return <Navigate to="/authority/queue" replace />;
  if (user.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
  if (user.role === 'principal') return <Navigate to="/principal/analytics" replace />;
  if (user.role === 'student') return <Navigate to="/student/my-complaints" replace />;

  return <Navigate to="/" replace />;
};

// Protected Route Wrapper: Enforces authenticated user & role permissions on the client
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0f6fb0] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized cross-role attempts to user's own authorized dashboard
    if (user.role === 'authority') return <Navigate to="/authority/queue" replace />;
    if (user.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
    if (user.role === 'principal') return <Navigate to="/principal/analytics" replace />;
    if (user.role === 'student') return <Navigate to="/student/my-complaints" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Landing / Gateway Hub */}
        <Route path="/" element={<HomePage />} />

        {/* Portal 1: Student / Public Complaint Submission Flow (No Auth Required) */}
        <Route path="/student" element={<ReportIssuePage />} />
        <Route path="/start-complaint" element={<ReportIssuePage />} />
        <Route path="/complaint" element={<ReportIssuePage />} />
        <Route path="/complaints" element={<ReportIssuePage />} />

        {/* Student / Public Complaint Tracking Flow (Public / No Admin Login Required) */}
        <Route path="/student/my-complaints" element={<MyComplaintsPage />} />
        <Route path="/track" element={<MyComplaintsPage />} />
        <Route path="/track-complaint" element={<MyComplaintsPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/staff" element={<LoginPage />} />
        <Route path="/staff-login" element={<LoginPage />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/admin-login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Portal 2: Authority Console (Authorized: authority) */}
        <Route
          path="/authority/queue"
          element={
            <ProtectedRoute allowedRoles={['authority']}>
              <ApprovalQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/queue/:id"
          element={
            <ProtectedRoute allowedRoles={['authority']}>
              <MaintenanceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/overview"
          element={
            <ProtectedRoute allowedRoles={['authority']}>
              <FacilitiesOverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/authority/technicians"
          element={
            <ProtectedRoute allowedRoles={['authority']}>
              <TechniciansListPage />
            </ProtectedRoute>
          }
        />

        {/* Portal 3: Service Provider (Authorized: provider) */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute allowedRoles={['provider']}>
              <ProviderDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Portal 4: Principal (Authorized: principal) */}
        <Route
          path="/principal/analytics"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/reports"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
