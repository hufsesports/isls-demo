import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type ProfileRow = {
  id: string;
  role: 'learner' | 'coach' | 'admin';
  full_name: string | null;
  cohort_code: string | null;
  created_at: string;
};

export default function Admin() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState<{ users: number; modules: number; outputs: number; bookings: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const [pRes, usersRes, modulesRes, outputsRes, bookingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,role,full_name,cohort_code,created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('modules').select('id', { count: 'exact', head: true }),
      supabase.from('outputs').select('id', { count: 'exact', head: true }),
      supabase.from('mentoring_bookings').select('id', { count: 'exact', head: true }),
    ]);

    if (pRes.error) setErr(pRes.error.message);
    setProfiles((pRes.data as any) ?? []);
    setStats({
      users: usersRes.count ?? 0,
      modules: modulesRes.count ?? 0,
      outputs: outputsRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateProfile(id: string, patch: Partial<Pick<ProfileRow, 'role' | 'cohort_code' | 'full_name'>>) {
    setErr(null);
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  return (
    <div className="container">
      <div className="title-row">
        <div>
          <h2 className="page-title">Admin</h2>
          <p className="subtitle">운영자용 지표 + 사용자/권한 관리 (DB 연동)</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div className="card" style={{ border: '1px solid rgba(251,191,36,.35)' }}>
          <h3>오류</h3>
          <div className="small">{err}</div>
        </div>
      ) : null}

      <div className="grid cols-4" style={{ marginTop: 12 }}>
        <div className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.03)' }}>
          <h3>Users</h3>
          <div className="meta">profiles</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats?.users ?? '—'}</div>
        </div>
        <div className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.03)' }}>
          <h3>Modules</h3>
          <div className="meta">modules</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats?.modules ?? '—'}</div>
        </div>
        <div className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.03)' }}>
          <h3>Outputs</h3>
          <div className="meta">outputs</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats?.outputs ?? '—'}</div>
        </div>
        <div className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.03)' }}>
          <h3>Bookings</h3>
          <div className="meta">mentoring_bookings</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{stats?.bookings ?? '—'}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Users (Top 50)</h3>
        <div className="meta">role/cohort_code 설정</div>
        {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
        {!loading && profiles.length === 0 ? (
          <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>유저가 없습니다.</div>
        ) : null}

        {!loading ? (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.8 }}>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Role</th>
                  <th style={{ padding: '10px 8px' }}>Cohort</th>
                  <th style={{ padding: '10px 8px' }}>Created</th>
                  <th style={{ padding: '10px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '10px 8px' }}>{p.full_name ?? p.id.slice(0, 8) + '…'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <select
                        value={p.role}
                        onChange={(e) => void updateProfile(p.id, { role: e.target.value as any })}
                        style={{ padding: 8, borderRadius: 10 }}
                      >
                        <option value="learner">learner</option>
                        <option value="coach">coach</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        value={p.cohort_code ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, cohort_code: v } : x)));
                        }}
                        onBlur={(e) => void updateProfile(p.id, { cohort_code: e.target.value || null })}
                        placeholder="2026-A"
                        style={{ padding: 8, borderRadius: 10, width: 110 }}
                      />
                    </td>
                    <td style={{ padding: '10px 8px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        className="btn"
                        onClick={() => void updateProfile(p.id, { full_name: p.full_name ?? 'User' })}
                      >
                        Normalize name
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
