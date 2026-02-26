import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

type ModuleRow = {
  id: string;
  cohort_code: string;
  title: string;
  description: string | null;
  content_url: string | null;
  sort_order: number;
};

type EnrollmentRow = {
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
};

type ModuleWithProgress = ModuleRow & {
  enrollment: EnrollmentRow;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function percent(n01: number) {
  return Math.round(clamp01(n01) * 100);
}

function Donut({ value01, label }: { value01: number; label: string }) {
  // SVG 도넛: 템플릿과 같은 사이즈/스타일
  const size = 220;
  const r = 100;
  const cx = 110;
  const cy = 110;
  const c = 2 * Math.PI * r;
  const done = c * clamp01(value01);
  const rest = c - done;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.10)"
        strokeWidth={20}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(93,214,255,.95)"
        strokeWidth={20}
        strokeLinecap="round"
        strokeDasharray={`${done.toFixed(2)} ${rest.toFixed(2)}`}
        strokeDashoffset={-0}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.08)"
        strokeWidth={20}
        strokeLinecap="round"
        strokeDasharray={`${rest.toFixed(2)} ${done.toFixed(2)}`}
        strokeDashoffset={-done}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={104} textAnchor="middle" fontSize={28} fontWeight={800} fill="white">
        {percent(value01)}%
      </text>
      <text x={cx} y={130} textAnchor="middle" fontSize={12} fill="rgba(231,239,255,.75)">
        {label}
      </text>
    </svg>
  );
}

function statusLabel(s: EnrollmentRow['status']) {
  if (s === 'completed') return 'Completed';
  if (s === 'in_progress') return 'In progress';
  return 'Not started';
}

export default function LMS() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ModuleWithProgress[]>([]);

  // 서버 RLS 정책 때문에 cohort_code가 꼭 필요합니다.
  const cohortCode = profile?.cohort_code ?? null;

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (!cohortCode) {
        // cohort_code가 없으면 modules_select_same_cohort 정책에 막혀 조회가 0건이 됩니다.
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: modules, error: mErr } = await supabase
        .from('modules')
        .select('id, cohort_code, title, description, content_url, sort_order')
        .eq('cohort_code', cohortCode)
        .order('sort_order', { ascending: true });

      if (!alive) return;
      if (mErr) {
        setError(mErr.message);
        setItems([]);
        setLoading(false);
        return;
      }

      const moduleIds = (modules ?? []).map((x) => x.id);
      const { data: enrolls, error: eErr } = await supabase
        .from('enrollments')
        .select('module_id, status, progress')
        .eq('user_id', user.id)
        .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000']);

      if (!alive) return;
      if (eErr) {
        setError(eErr.message);
        setItems([]);
        setLoading(false);
        return;
      }

      const byModule = new Map<string, EnrollmentRow>();
      (enrolls ?? []).forEach((e) => byModule.set(e.module_id, {
        module_id: e.module_id,
        status: e.status,
        progress: Number(e.progress ?? 0),
      }));

      const merged: ModuleWithProgress[] = (modules ?? []).map((m) => ({
        ...m,
        enrollment: byModule.get(m.id) ?? { module_id: m.id, status: 'not_started', progress: 0 },
      }));

      setItems(merged);
      setLoading(false);
    }
    run();
    return () => {
      alive = false;
    };
  }, [user?.id, cohortCode]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((x) => x.enrollment.status === 'completed').length;
    const inProgress = items.filter((x) => x.enrollment.status === 'in_progress').length;
    const notStarted = items.filter((x) => x.enrollment.status === 'not_started').length;
    const avgProgress01 = total ? items.reduce((a, x) => a + clamp01((x.enrollment.progress ?? 0) / 100), 0) / total : 0;
    return { total, completed, inProgress, notStarted, avgProgress01 };
  }, [items]);

  const nowPlaying = useMemo(() => {
    if (!items.length) return null;
    const inProg = items.find((x) => x.enrollment.status === 'in_progress');
    if (inProg) return inProg;
    const notStarted = items.find((x) => x.enrollment.status === 'not_started');
    return notStarted ?? items[0];
  }, [items]);

  return (
    <div className="container">
      <div className="title-row">
        <div>
          <h2 className="page-title">Online Learning</h2>
          <p className="subtitle">모듈별 강의 시청·퀴즈·성과물 제작을 이어서 진행합니다.</p>
        </div>
        <div className="actions">
          {profile?.role === 'admin' ? (
            <Link className="btn" to="/admin">
              Admin
            </Link>
          ) : null}
          <Link className="btn primary" to="/home">
            Demo Mode
          </Link>
        </div>
      </div>

      {!cohortCode ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Set your cohort_code first</h3>
          <div className="meta">
            현재 계정의 <b>profiles.cohort_code</b> 값이 비어 있어서, RLS 정책상 모듈을 조회할 수 없습니다.
          </div>
          <div style={{ marginTop: 12 }} className="small">
            Supabase → Table Editor → <b>profiles</b> 에서 본인 row의 <b>cohort_code</b> 를 예: <b>2026-A</b> 로 설정해 주세요.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Loading error</h3>
          <div className="meta">{error}</div>
        </div>
      ) : null}

      <div className="split">
        <div className="card">
          <h3>Now Playing</h3>
          <div className="meta">
            {nowPlaying ? `Module · ${nowPlaying.title}` : loading ? 'Loading…' : 'No modules yet'}
          </div>

          <div
            style={{
              marginTop: 12,
              aspectRatio: '16/9',
              width: '100%',
              borderRadius: 16,
              border: '1px solid var(--line)',
              background: 'rgba(255,255,255,.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {nowPlaying?.content_url ? (
              <iframe
                title="module-video"
                src={nowPlaying.content_url}
                style={{ width: '100%', height: '100%', border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 42 }}>▶</div>
                <div className="small">Video placeholder</div>
              </div>
            )}
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={!nowPlaying}
              onClick={async () => {
                if (!user?.id || !nowPlaying) return;
                // "Continue" 클릭 시 in_progress로 전환
                const { error: upErr } = await supabase.from('enrollments').upsert(
                  {
                    user_id: user.id,
                    module_id: nowPlaying.id,
                    status: 'in_progress',
                    progress: Math.max(1, Number(nowPlaying.enrollment.progress ?? 0)),
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id,module_id' }
                );
                if (!upErr) {
                  // 간단 리프레시
                  window.location.reload();
                }
              }}
            >
              Continue
            </button>
            <Link className="btn" to="/output">
              Go to Output
            </Link>
            {nowPlaying ? <span className="pill">{statusLabel(nowPlaying.enrollment.status)}</span> : null}
          </div>
        </div>

        <div className="card">
          <h3>Weekly Progress</h3>
          <div className="meta">Your pace vs cohort median</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 220, display: 'flex', justifyContent: 'center' }}>
              <Donut value01={stats.avgProgress01} label="Learning progress" />
            </div>
            <div className="legend">
              <div className="item">
                <span className="dot" />Completed: {stats.completed}
              </div>
              <div className="item">
                <span className="dot purple" />In progress: {stats.inProgress}
              </div>
              <div className="item">
                <span className="dot warn" />Not started: {stats.notStarted}
              </div>
              <div className="item">
                <Link className="btn" to="/mentoring">
                  Book mentoring
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Modules</h3>

      {loading ? (
        <div className="card">
          <div className="meta">Loading modules…</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <h3>No modules found</h3>
          <div className="meta">
            {cohortCode
              ? `cohort_code = ${cohortCode} 인 모듈이 아직 없습니다. (seed.sql을 실행하면 샘플 모듈이 생성됩니다.)`
              : '먼저 profiles.cohort_code 를 설정해 주세요.'}
          </div>
        </div>
      ) : (
        <div className="grid cols-3">
          {items.map((m) => (
            <div key={m.id} className="card">
              <h3>{m.title}</h3>
              <div className="meta">{m.description ?? '—'}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <span className="pill">{statusLabel(m.enrollment.status)}</span>
                <span className="pill">Progress: {Math.round(Number(m.enrollment.progress ?? 0))}%</span>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                {m.content_url ? (
                  <a className="btn" href={m.content_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <button className="btn" disabled>
                    Open
                  </button>
                )}
                <Link className="btn primary" to="/output">
                  View output
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
