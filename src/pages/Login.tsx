import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { user, signInWithPassword, signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from ?? '/home';

  const demoEmail = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

  const [email, setEmail] = useState(demoEmail ?? '');
  const [password, setPassword] = useState(demoPassword ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length > 3, [email, password]);

  if (user) return <Navigate to={from} replace />;

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
        <div className="small" style={{ marginBottom: 16 }}>
          {mode === 'signin'
            ? 'ISLS WebApp에 로그인하세요. (Learner/Coach/Admin 권한에 따라 화면이 달라집니다)'
            : '테스트 계정을 생성합니다. (이메일 인증이 켜져 있으면 인증 메일을 확인해야 로그인됩니다)'}
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <label className="small">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@domain.com"
            autoComplete="email"
          />

          <label className="small">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error ? (
            <div className="card" style={{ border: '1px solid rgba(255,0,0,.2)' }}>
              <div className="small">{error}</div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn"
              disabled={!canSubmit || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const trimmed = email.trim();
                const res =
                  mode === 'signin'
                    ? await signInWithPassword(trimmed, password)
                    : await signUpWithPassword(trimmed, password);
                setBusy(false);
                if (!res.ok) {
                  setError(res.message ?? (mode === 'signin' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.'));
                  return;
                }

                if (mode === 'signin') {
                  navigate(from, { replace: true });
                } else {
                  // If email confirmation is required, users may not have a session yet.
                  setMode('signin');
                  setError('회원가입 요청이 완료되었습니다. 이메일 인증이 필요하면 메일함에서 확인 후 로그인하세요.');
                }
              }}
            >
              {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating…') : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>

            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => {
                setError(null);
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              }}
              title={mode === 'signin' ? '회원가입으로 전환' : '로그인으로 전환'}
            >
              {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
            </button>

            <button
              className="btn ghost"
              onClick={() => navigate('/home')}
              title="데모/둘러보기"
            >
              Continue as Guest
            </button>
          </div>

          <div className="small" style={{ opacity: 0.8 }}>
            * Guest 모드는 화면 탐색만 가능하도록 구성할 수 있고, 실제 SaaS에서는 권한 정책으로 제한합니다.
            <br />
            * 테스트용으로 이메일 인증을 끄려면 Supabase Authentication 설정에서 “Confirm email”을 OFF로 설정하세요.
          </div>
        </div>
      </div>
    </div>
  );
}
