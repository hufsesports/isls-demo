import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from '../ui/Shell';
import AdminShell from '../ui/AdminShell';
import ProtectedRoute from '../auth/ProtectedRoute';
import Intro from '../pages/Intro';
import Login from '../pages/Login';
import Home from '../pages/Home';
import LMS from '../pages/LMS';
import Output from '../pages/Output';
import Mentoring from '../pages/Mentoring';
import Alumni from '../pages/Alumni';
import Coach from '../pages/Coach';
import Admin from '../pages/Admin';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Intro />} />

      <Route path="/login" element={<Login />} />

      {/* 로그인 필요 없는(데모/둘러보기) 영역 */}
      <Route element={<Shell />}>
        <Route path="/home" element={<Home />} />
      </Route>

      {/* 로그인 필요 영역 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/lms" element={<LMS />} />
          <Route path="/output" element={<Output />} />
          <Route path="/mentoring" element={<Mentoring />} />
          <Route path="/alumni" element={<Alumni />} />
        </Route>
      </Route>

      {/* Coach 이상 */}
      <Route element={<ProtectedRoute allow={["coach", "admin"]} />}>
        <Route element={<Shell />}>
          <Route path="/coach" element={<Coach />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
