import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

type Alumni = {
  id: string;
  full_name: string;
  cohort_code: string;
  organization: string | null;
  region: string | null;
  expertise_tags: string[] | null;
  headline: string | null;
};

type LinkReq = {
  id: string;
  requester_id: string;
  target_alumni_id: string;
  reason: string | null;
  status: 'requested' | 'introduced' | 'rejected' | 'completed';
  created_at: string;
};

export default function Alumni() {
  const { profile } = useAuth();
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [reqs, setReqs] = useState<LinkReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    const [aRes, rRes] = await Promise.all([
      supabase
        .from('alumni_directory')
        .select('id,full_name,cohort_code,organization,region,expertise_tags,headline')
        .order('cohort_code', { ascending: false }),
      supabase
        .from('alumni_links')
        .select('id,requester_id,target_alumni_id,reason,status,created_at')
        .order('created_at', { ascending: false }),
    ]);
    if (aRes.error) setErr(aRes.error.message);
    if (rRes.error) setErr(rRes.error.message);
    setAlumni((aRes.data as any) ?? []);
    setReqs((rRes.data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alumni;
    return alumni.filter((a) => {
      const tags = (a.expertise_tags ?? []).join(' ').toLowerCase();
      return (
        a.full_name.toLowerCase().includes(q) ||
        (a.organization ?? '').toLowerCase().includes(q) ||
        (a.region ?? '').toLowerCase().includes(q) ||
        (a.headline ?? '').toLowerCase().includes(q) ||
        tags.includes(q)
      );
    });
  }, [alumni, query]);

  async function requestIntro(alumniId: string) {
    if (!profile?.id) return;
    setErr(null);
    const { error } = await supabase.from('alumni_links').insert({
      requester_id: profile.id,
      target_alumni_id: alumniId,
      reason: reason.trim() || null,
      status: 'requested',
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setReason('');
    await load();
  }

  return (
    <div className="container">
      <div className="title-row">
        <div>
          <h2 className="page-title">Alumni</h2>
          <p className="subtitle">코호트/분야별 Alumni 디렉토리 + 소개 요청 (DB 연동)</p>
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

      <div className="split">
        <div className="card">
          <h3>Directory</h3>
          <div className="meta">검색 후 소개 요청</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name/org/region/tags"
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="소개 요청 사유/목적 (선택)"
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
          </div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && filtered.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>
              결과가 없습니다. (seed.sql로 샘플 alumni를 넣을 수 있습니다)
            </div>
          ) : null}
          {!loading
            ? filtered.map((a) => (
                <div
                  key={a.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>{a.full_name}</h3>
                  <div className="small" style={{ opacity: 0.8 }}>
                    {a.headline ?? ''}
                    {a.organization ? ` · ${a.organization}` : ''}
                    {a.region ? ` · ${a.region}` : ''}
                    {a.cohort_code ? ` · Cohort: ${a.cohort_code}` : ''}
                  </div>
                  {a.expertise_tags?.length ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {a.expertise_tags.map((t) => (
                        <span key={t} className="pill">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn primary" onClick={() => void requestIntro(a.id)}>
                      Request Intro
                    </button>
                  </div>
                </div>
              ))
            : null}
        </div>

        <div className="card">
          <h3>My Requests</h3>
          <div className="meta">소개 요청 상태</div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && reqs.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>
              아직 소개 요청이 없습니다.
            </div>
          ) : null}
          {!loading
            ? reqs.map((r) => (
                <div
                  key={r.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>Request</h3>
                  <div className="small" style={{ opacity: 0.8 }}>
                    status: {r.status} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  {r.reason ? <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>{r.reason}</div> : null}
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
