import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/home', label: 'Home' },
  { to: '/lms', label: 'LMS' },
  { to: '/output', label: 'Output' },
  { to: '/mentoring', label: 'Mentoring' },
  { to: '/alumni', label: 'Alumni' },
  { to: '/coach', label: 'AI Coach' }
];

export default function Tabbar() {
  return (
    <div className="tabbar">
      <div className="tabbar-inner">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          >
            <div className="ico" />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
