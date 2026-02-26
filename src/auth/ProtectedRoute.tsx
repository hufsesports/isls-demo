import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';

export default function ProtectedRoute({ allow }: { allow?: UserRole[] }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <div className="card">
          <div className="small">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 프로필이 아직 없으면(초기 세팅 전) Learner로 간주
  const role = profile?.role ?? ('learner' as const);

  if (allow && allow.length > 0 && !allow.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
