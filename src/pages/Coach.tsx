import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { fmtDateTime } from '../lib/format';

type OutputRow = {
  id: string;
  title: string;
  content: string | null;
  review_status: 'submitted' | 'reviewing' | 'approved' | 'revision_needed';
  reviewer_id: string | null;
  user_id: string;
  updated_at: string;
  // outputs has *two* FKs to profiles (user_id, reviewer_id).
  // We must disambiguate embed joins with explicit FK constraint names.
  author?: { full_name: string | null } | null;
  reviewer?: { full_name: string | null } | null;
};

type Slot = {
  id: string;
  start_at: string;
  end_at: string;
  location: string | null;
  meeting_url: string | null;
  capacity: number;
};

export default function Coach() {
  const { profile } = useAuth();
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // slot form
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [capacity, setCapacity] = useState(1);

  async function load() {
    setLoading(true);
    setErr(null);

    // 1) Load outputs with disambiguated embeds.
    // Default Postgres constraint names (created by Supabase) are typically:
    // - outputs_user_id_fkey
    // - outputs_reviewer_id_fkey
    // If your project has different names, adjust them here.
    const outputsQuery = supabase
      .from('outputs')
      .select(
        'id,title,content,review_status,reviewer_id,user_id,updated_at,' +
          ' author:profiles!outputs_user_id_fkey(full_name),' +
          ' reviewer:profiles!outputs_reviewer_id_fkey(full_name)'
      )
      .order('updated_at', { ascending: false });

    const slotsQuery = supabase
      .from('mentoring_slots')
      .select('id,start_at,end_at,location,meeting_url,capacity')
      .order('start_at', { ascending: true });

    const [oRes, sRes] = await Promise.all([outputsQuery, slotsQuery]);

    // Fallback: if FK constraint names differ in this DB, the embed will fail.
    // In that case, we still show the list (without author/reviewer names)
    // so coaches can proceed with review workflow.
    let outputsData: any = oRes.data;
    let outputsErr = oRes.error;
    if (outputsErr) {
      const fallback = await supabase
        .from('outputs')
        .select('id,title,content,review_status,reviewer_id,user_id,updated_at')
        .order('updated_at', { ascending: false });
      if (!fallback.error) {
        outputsErr = null;
        outputsData = fallback.data;
      }
    }

    if (outputsErr) setErr(outputsErr.message);
    if (sRes.error) setErr(sRes.error.message);
    setOutputs((outputsData as any) ?? []);
    setSlots((sRes.data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function claimForReview(id: string) {
    if (!profile?.id) return;
    setErr(null);
    const { error } = await supabase
      .from('outputs')
      .update({ reviewer_id: profile.id, review_status: 'reviewing', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function setStatus(id: string, status: OutputRow['review_status']) {
    setErr(null);
    const { error } = await supabase
      .from('outputs')
      .update({ review_status: status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function createSlot() {
    if (!profile?.id) return;
    setErr(null);
    if (!startAt || !endAt) {
      setErr('start/end 시간을 입력해 주세요.');
      return;
    }
    const { error } = await supabase.from('mentoring_slots').insert({
      coach_id: profile.id,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      location: location.trim() || null,
      meeting_url: meetingUrl.trim() || null,
      capacity,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setStartAt('');
    setEndAt('');
    setLocation('');
    setMeetingUrl('');
    setCapacity(1);
    await load();
  }

  const mine = profile?.id ? outputs.filter((o) => o.reviewer_id === profile.id) : [];
  const pending = outputs.filter((o) => o.review_status === 'submitted' || o.review_status === 'revision_needed');

  return (
    <div className="container">
      <div className="title-row">
        <div>
          <h2 className="page-title">Coach</h2>
          <p className="subtitle">코호트 Output 리뷰 + Mentoring 슬롯 생성 (DB 연동)</p>
        </div>
        <div className="actions">
          <a className="btn" href="#/mentoring">
            Mentoring
          </a>
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
          <h3>Pending Reviews</h3>
          <div className="meta">submitted / revision_needed</div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && pending.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>대기 중인 항목이 없습니다.</div>
          ) : null}
          {!loading
            ? pending.map((o) => (
                <div
                  key={o.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>{o.title}</h3>
                  <div className="small" style={{ opacity: 0.8 }}>
                    {o.author?.full_name ? `Learner: ${o.author.full_name}` : `Learner: ${o.user_id}`}
                    {' · '}
                    {o.review_status}
                  </div>
                  {o.content ? <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>{o.content}</div> : null}
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn primary" onClick={() => void claimForReview(o.id)}>
                      Claim & Start
                    </button>
                  </div>
                </div>
              ))
            : null}
        </div>

        <div className="card">
          <h3>My Review Queue</h3>
          <div className="meta">내가 리뷰 중인 항목</div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && mine.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>아직 할당된 항목이 없습니다.</div>
          ) : null}
          {!loading
            ? mine.map((o) => (
                <div
                  key={o.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>{o.title}</h3>
                  <div className="small" style={{ opacity: 0.8 }}>
                    {o.review_status} · updated {new Date(o.updated_at).toLocaleDateString()}
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn" onClick={() => void setStatus(o.id, 'revision_needed')}>
                      Revision
                    </button>
                    <button className="btn" onClick={() => void setStatus(o.id, 'approved')}>
                      Approve
                    </button>
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>

      <div className="split" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Create Mentoring Slot</h3>
          <div className="meta">Coach 전용</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <label className="small">
              Start (local)
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6 }}
              />
            </label>
            <label className="small">
              End (local)
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 12, marginTop: 6 }}
              />
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="Meeting URL (optional)"
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value || 1))}
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
            <div className="row">
              <button className="btn primary" onClick={() => void createSlot()}>
                Create Slot
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Slots (visible)</h3>
          <div className="meta">현재 테이블에 있는 슬롯</div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && slots.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>슬롯이 없습니다.</div>
          ) : null}
          {!loading
            ? slots.map((s) => (
                <div
                  key={s.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>{fmtDateTime(s.start_at)} ~ {fmtDateTime(s.end_at)}</h3>
                  <div className="small" style={{ opacity: 0.8 }}>
                    {s.location ? `Location: ${s.location}` : 'Location: TBD'}
                    {s.meeting_url ? ` · ${s.meeting_url}` : ''}
                    {' · '}capacity {s.capacity}
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
