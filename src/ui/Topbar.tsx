import React from 'react';

export default function Topbar({
  roleLabel,
  userEmail,
  onSignOut,
}: {
  roleLabel: string;
  userEmail?: string | null;
  onSignOut?: () => void;
}) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>ISLS · International Sports Leadership</h1>
            <div className="small">Post-program Support SaaS (MVP)</div>
          </div>
        </div>

        <div className="badges">
          <span className="badge accent">WebApp</span>
          <span className="badge">Cohort: 2026-A</span>
          <span className="badge">Role: {roleLabel}</span>
          {userEmail ? <span className="badge">{userEmail}</span> : null}
          {userEmail && onSignOut ? (
            <button className="btn" style={{ padding: '6px 10px', borderRadius: 12 }} onClick={onSignOut}>
              Sign out
            </button>
          ) : null}
        </div>

        <div className="search">
          <span className="small">⌘</span>
          <input placeholder="Search modules, mentors, alumni…" />
        </div>
      </div>
    </div>
  );
}
