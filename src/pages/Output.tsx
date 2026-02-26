import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

type Module = { id: string; title: string; sort_order: number };
type OutputRow = {
  id: string;
  title: string;
  content: string | null;
  review_status: 'submitted' | 'reviewing' | 'approved' | 'revision_needed';
  created_at: string;
  updated_at: string;
  module_id: string | null;
};

function stageOf(status: OutputRow['review_status']): 'Draft' | 'Review' | 'Final' {
  if (status === 'approved') return 'Final';
  if (status === 'reviewing') return 'Review';
  return 'Draft';
}

export default function Output() {
  const { profile } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [rows, setRows] = useState<OutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState<string>('');
  const [content, setContent] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    const cohort = profile?.cohort_code ?? null;
    if (!cohort) {
      setLoading(false);
      setErr('profiles.cohort_code가 비어 있습니다. Supabase Table Editor에서 본인 cohort_code를 먼저 설정해 주세요.');
      return;
    }

    const [mRes, oRes] = await Promise.all([
      supabase
        .from('modules')
        .select('id,title,sort_order')
        .eq('cohort_code', cohort)
        .order('sort_order', { ascending: true }),
      supabase
        .from('outputs')
        .select('id,title,content,review_status,created_at,updated_at,module_id')
        .eq('cohort_code', cohort)
        .order('updated_at', { ascending: false }),
    ]);

    if (mRes.error) setErr(mRes.error.message);
    if (oRes.error) setErr(oRes.error.message);
    setModules((mRes.data as any) ?? []);
    setRows((oRes.data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.cohort_code]);

  const grouped = useMemo(() => {
    const g: Record<'Draft' | 'Review' | 'Final', OutputRow[]> = { Draft: [], Review: [], Final: [] };
    for (const r of rows) g[stageOf(r.review_status)].push(r);
    return g;
  }, [rows]);

  async function createOutput() {
    setErr(null);
    if (!profile?.id) return;
    const cohort = profile.cohort_code;
    if (!cohort) return;
    if (!title.trim()) {
      setErr('제목을 입력해 주세요.');
      return;
    }
    const { error } = await supabase.from('outputs').insert({
      cohort_code: cohort,
      user_id: profile.id,
      module_id: moduleId || null,
      title: title.trim(),
      content: content.trim() || null,
      review_status: 'submitted',
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle('');
    setContent('');
    setModuleId('');
    await load();
  }

  async function bumpStatus(id: string, next: OutputRow['review_status']) {
    setErr(null);
    const { error } = await supabase
      .from('outputs')
      .update({ review_status: next, updated_at: new Date().toISOString() })
      .eq('id', id);
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
          <h2 className="page-title">Outputs</h2>
          <p className="subtitle">성과물을 Draft → Review → Final 흐름으로 관리합니다. (DB 연동)</p>
        </div>
        <div className="actions">
          <a className="btn" href="#/lms">
            Back to LMS
          </a>
        </div>
      </div>

      {err ? (
        <div className="card" style={{ border: '1px solid rgba(251,191,36,.35)' }}>
          <h3>설정/권한 오류</h3>
          <div className="small">{err}</div>
        </div>
      ) : null}

      <div className="split">
        <div className="card">
          <h3>새 Output 제출</h3>
          <div className="meta">간단 MVP 제출 폼</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Pitch deck v1"
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            >
              <option value="">(선택) 연결 모듈</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="간단 메모 / 링크 / 요청사항"
              rows={4}
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <div className="row">
              <button className="btn primary" onClick={() => void createOutput()}>
                Submit
              </button>
              <button className="btn" onClick={() => void load()}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Status Distribution</h3>
          <div className="meta">Draft / Review / Final</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <div className="pill">Draft: {grouped.Draft.length}</div>
            <div className="pill">Review: {grouped.Review.length}</div>
            <div className="pill">Final: {grouped.Final.length}</div>
          </div>
          <div className="small" style={{ marginTop: 10, opacity: 0.8 }}>
            * 이 화면은 Kanban UI를 단순화한 DB 연동 MVP입니다.
          </div>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 14 }}>
        {(['Draft', 'Review', 'Final'] as const).map((stage) => (
          <div key={stage} className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,.03)' }}>
            <h3>{stage}</h3>
            <div className="meta">
              {stage === 'Draft' ? '작성/수정' : stage === 'Review' ? '코치 피드백' : '완료'}
            </div>
            {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
            {!loading && grouped[stage].length === 0 ? (
              <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>
                없음
              </div>
            ) : null}
            {!loading
              ? grouped[stage].map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                  >
                    <h3 style={{ fontSize: 14 }}>{r.title}</h3>
                    <div className="small" style={{ opacity: 0.8 }}>
                      {r.review_status} · {new Date(r.updated_at).toLocaleDateString()}
                    </div>
                    {r.content ? <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>{r.content}</div> : null}
                    <div className="row" style={{ marginTop: 10 }}>
                      {stage === 'Draft' ? (
                        <button className="btn" onClick={() => void bumpStatus(r.id, 'reviewing')}>
                          Request Review
                        </button>
                      ) : null}
                      {stage === 'Review' ? (
                        <button className="btn" onClick={() => void bumpStatus(r.id, 'revision_needed')}>
                          Needs Revision
                        </button>
                      ) : null}
                      {stage === 'Review' ? (
                        <button className="btn" onClick={() => void bumpStatus(r.id, 'approved')}>
                          Mark Final
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              : null}
          </div>
        ))}
      </div>
    </div>
  );
}
