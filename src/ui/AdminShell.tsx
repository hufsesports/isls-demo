import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import { useAuth } from '../auth/AuthContext';

export default function AdminShell() {
  const { profile, user, signOut } = useAuth();
  const roleLabel = (profile?.role ?? 'admin').toUpperCase();
  return (
    <>
      <Topbar roleLabel={roleLabel} userEmail={user?.email ?? null} onSignOut={() => signOut()} />
      <Outlet />
    </>
  );
}
