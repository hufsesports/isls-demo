import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Intro() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, []);

  const nextPath = useMemo(() => {
    // If a session exists, go to home; otherwise go to login.
    return session ? '/home' : '/login';
  }, [session]);

  const onEnter = () => {
    nav(nextPath);
  };

  return (
    <div className="intro">
      <div className={"intro-inner " + (ready ? 'in' : '')}>
        <div className="intro-mark" aria-hidden="true" />
        <div className="intro-title">
          <div className="intro-eyebrow">Global Sports Leadership Programme</div>
          <h1>Management Hub MVP</h1>
          <div className="intro-kr">글로벌 스포츠 리더십 과정 관리 허브 MVP</div>
        </div>

        <button className="intro-enter" onClick={onEnter} disabled={loading}>
          ENTER
        </button>

        <div className="intro-foot">
          <span className="small">
            {loading ? 'Checking session…' : session ? 'Signed in detected' : 'Demo access'}
          </span>
        </div>
      </div>
    </div>
  );
}
