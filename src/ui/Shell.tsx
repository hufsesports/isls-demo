import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Tabbar from './Tabbar';
import { useAuth } from '../auth/AuthContext';

export default function Shell() {
  const { profile, user, signOut } = useAuth();
  const roleLabel = (profile?.role ?? 'learner').toUpperCase();
  return (
    <>
      <Topbar roleLabel={roleLabel} userEmail={user?.email ?? null} onSignOut={() => signOut()} />
      <Outlet />
      <Tabbar />
    </>
  );
}
