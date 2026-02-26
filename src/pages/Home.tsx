import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type Counts = { modules: number; outputs: number; mentoring: number };

export default function Home() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState<Counts>({ modules: 0, outputs: 0, mentoring: 0 });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const cohort = profile?.cohort_code ?? null;
      if (!cohort) {
        if (mounted) setCounts({ modules: 0, outputs: 0, mentoring: 0 });
        return;
      }

      // Best-effort counts; failures should not block the demo UI.
      const [m, o, r] = await Promise.all([
        supabase.from('modules').select('id', { count: 'exact', head: true }).eq('cohort_code', cohort),
        supabase.from('outputs').select('id', { count: 'exact', head: true }).eq('cohort_code', cohort),
        supabase.from('mentoring_requests').select('id', { count: 'exact', head: true }).eq('cohort_code', cohort),
      ]);

      if (!mounted) return;
      setCounts({
        modules: m.count ?? 0,
        outputs: o.count ?? 0,
        mentoring: r.count ?? 0,
      });
    };

    run();
    return () => {
      mounted = false;
    };
  }, [profile?.cohort_code]);

  const cohortLabel = useMemo(() => profile?.cohort_code ?? '—', [profile?.cohort_code]);

  return (
    <div>
      <div className="title-row">
        <div>
          <h2 className="page-title">ISLS Management Hub</h2>
          <p className="subtitle">
            Demo dashboard · Cohort <span className="pill">{cohortLabel}</span>
          </p>
        </div>
        <div className="actions">
          <Link className="btn primary" to="/mentoring">Mentoring</Link>
          <Link className="btn" to="/output">Outputs</Link>
          <Link className="btn ghost" to="/lms">LMS</Link>
        </div>
      </div>

      <div className="grid cols-3">
        <Link to="/lms" className="card demo-card">
          <div className="kpi">
            <div>
              <h3>Learning Modules</h3>
              <div className="meta">Cohort modules available</div>
            </div>
            <div className="value">{counts.modules}</div>
          </div>
        </Link>

        <Link to="/output" className="card demo-card">
          <div className="kpi">
            <div>
              <h3>Outputs</h3>
              <div className="meta">Draft / Review pipeline</div>
            </div>
            <div className="value">{counts.outputs}</div>
          </div>
        </Link>

        <Link to="/mentoring" className="card demo-card">
          <div className="kpi">
            <div>
              <h3>Mentoring</h3>
              <div className="meta">Requests & sessions</div>
            </div>
            <div className="value">{counts.mentoring}</div>
          </div>
        </Link>
      </div>

      <div className="section-title">Quick demo flow</div>
      <div className="card">
        <div className="row">
          <span className="pill">1. Learner → Submit Output</span>
          <span className="pill">2. Coach → Claim & Review</span>
          <span className="pill">3. Learner → Request Mentoring</span>
          <span className="pill">4. Coach → Accept & Propose</span>
        </div>
        <div className="meta" style={{ marginTop: 10 }}>
          Tip: If you see “cohort not set”, update <b>profiles.cohort_code</b> in Supabase for the demo accounts.
        </div>
      </div>
    </div>
  );
}
