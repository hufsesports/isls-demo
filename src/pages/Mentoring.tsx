import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { fmtDateTime } from '../lib/format';

type Slot = {
  id: string;
  coach_id: string;
  start_at: string;
  end_at: string;
  location: string | null;
  meeting_url: string | null;
  capacity: number;
};

type Booking = {
  id: string;
  slot_id: string;
  learner_id: string;
  status: 'booked' | 'cancelled' | 'completed';
  note: string | null;
  slot?: Slot;
};

export default function Mentoring() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);

    const nowIso = new Date().toISOString();
    const [sRes, bRes] = await Promise.all([
      supabase
        .from('mentoring_slots')
        .select('id,coach_id,start_at,end_at,location,meeting_url,capacity')
        .gte('end_at', nowIso)
        .order('start_at', { ascending: true }),
      supabase
        .from('mentoring_bookings')
        .select('id,slot_id,learner_id,status,note, slot:mentoring_slots(id,coach_id,start_at,end_at,location,meeting_url,capacity)')
        .order('created_at', { ascending: false }),
    ]);

    if (sRes.error) setErr(sRes.error.message);
    if (bRes.error) setErr(bRes.error.message);
    setSlots((sRes.data as any) ?? []);
    setBookings(((bRes.data as any) ?? []).map((x: any) => ({ ...x, slot: x.slot })));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const myBookingBySlot = useMemo(() => {
    const m = new Map<string, Booking>();
    for (const b of bookings) {
      if (b.status !== 'cancelled') m.set(b.slot_id, b);
    }
    return m;
  }, [bookings]);

  async function book(slotId: string) {
    if (!profile?.id) return;
    setErr(null);
    const { error } = await supabase.from('mentoring_bookings').insert({
      slot_id: slotId,
      learner_id: profile.id,
      status: 'booked',
      note: note.trim() || null,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setNote('');
    await load();
  }

  async function cancel(bookingId: string) {
    setErr(null);
    const { error } = await supabase.from('mentoring_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
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
          <h2 className="page-title">Mentoring</h2>
          <p className="subtitle">캘린더 예약 → 확정 → 완료 흐름 (DB 연동)</p>
        </div>
        <div className="actions">
          <a className="btn" href="#/coach">
            Coach tools
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
          <h3>Available Slots</h3>
          <div className="meta">선택 후 예약</div>
          <div style={{ marginTop: 12 }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예약 메모(선택): 어떤 피드백을 받고 싶으신가요?"
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 12 }}
            />
          </div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && slots.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>
              현재 예약 가능한 슬롯이 없습니다. (Coach가 슬롯을 생성해야 합니다)
            </div>
          ) : null}

          {!loading
            ? slots.map((s) => {
                const my = myBookingBySlot.get(s.id);
                return (
                  <div
                    key={s.id}
                    className="card"
                    style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                  >
                    <h3 style={{ fontSize: 14 }}>{fmtDateTime(s.start_at)} ~ {fmtDateTime(s.end_at)}</h3>
                    <div className="small" style={{ opacity: 0.8 }}>
                      {s.location ? `Location: ${s.location}` : 'Location: TBD'}
                      {s.meeting_url ? ` · Online: ${s.meeting_url}` : ''}
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      {my ? (
                        <div className="pill">My booking: {my.status}</div>
                      ) : (
                        <button className="btn primary" onClick={() => void book(s.id)}>
                          Book
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <div className="card">
          <h3>My Bookings</h3>
          <div className="meta">예약/취소/완료 내역</div>
          {loading ? <div className="small" style={{ marginTop: 12 }}>Loading…</div> : null}
          {!loading && bookings.length === 0 ? (
            <div className="small" style={{ marginTop: 12, opacity: 0.7 }}>
              아직 예약이 없습니다.
            </div>
          ) : null}
          {!loading
            ? bookings.map((b) => (
                <div
                  key={b.id}
                  className="card"
                  style={{ marginTop: 10, boxShadow: 'none', background: 'rgba(255,255,255,.04)' }}
                >
                  <h3 style={{ fontSize: 14 }}>{b.slot ? fmtDateTime(b.slot.start_at) : b.slot_id}</h3>
                  <div className="small" style={{ opacity: 0.8 }}>Status: {b.status}</div>
                  {b.note ? <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>Note: {b.note}</div> : null}
                  {b.status === 'booked' ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn" onClick={() => void cancel(b.id)}>
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
