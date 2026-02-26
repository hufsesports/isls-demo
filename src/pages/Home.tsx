import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type Counts = { modules: number; outputs: number; mentoring: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function Radar({ values, labels }: { values: number[]; labels: string[] }) {
  // Simple SVG radar (no external chart libs) for demo stability.
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 92;
  const n = values.length;

  const angles = Array.from({ length: n }, (_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const point = (k: number, scale: number) => {
    const a = angles[k];
    return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale] as const;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const poly = values
    .map((v, i) => {
      const [x, y] = point(i, clamp01(v));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label="Radar chart">
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.30)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.00)" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r * 1.45} fill="url(#radarGlow)" />

      {/* grid */}
      {gridLevels.map((lv) => (
        <polygon
          key={lv}
          points={angles
            .map((_, i) => {
              const [x, y] = point(i, lv);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
      ))}

      {/* spokes */}
      {angles.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        );
      })}

      {/* data */}
      <polygon points={poly} fill="rgba(99,102,241,0.35)" stroke="rgba(99,102,241,0.9)" strokeWidth="2" />

      {/* labels */}
      {labels.map((lab, i) => {
        const [x, y] = point(i, 1.17);
        return (
          <text
            key={lab}
            x={x}
            y={y}
            textAnchor={x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'}
            dominantBaseline={y < cy ? 'auto' : 'hanging'}
            fill="rgba(255,255,255,0.72)"
            fontSize="11"
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

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

  const radar = useMemo(() => {
    // Normalized demo values (0..1). Keeps radar meaningful even with small datasets.
    const vModules = clamp01((counts.modules ?? 0) / 12);
    const vOutputs = clamp01((counts.outputs ?? 0) / 8);
    const vMentoring = clamp01((counts.mentoring ?? 0) / 6);
    // Extra axes are synthetic for demo storytelling.
    const vEngagement = clamp01(vOutputs * 0.55 + vMentoring * 0.45 + 0.12);
    const vImpact = clamp01(vModules * 0.45 + vOutputs * 0.35 + vMentoring * 0.2 + 0.08);
    return {
      labels: ['Learning', 'Outputs', 'Mentoring', 'Engagement', 'Impact'],
      values: [vModules, vOutputs, vMentoring, vEngagement, vImpact],
    };
  }, [counts.modules, counts.outputs, counts.mentoring]);

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
          <Link className="btn primary" to="/mentoring">
            Mentoring
          </Link>
          <Link className="btn" to="/output">
            Outputs
          </Link>
          <Link className="btn ghost" to="/lms">
            LMS
          </Link>
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

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Cohort readiness (Radar)
          </div>
          <div className="meta" style={{ marginBottom: 12 }}>
            A quick, presentation-friendly snapshot for demos (auto-calculated from cohort activity).
          </div>
          <div className="radar-wrap">
            <Radar values={radar.values} labels={radar.labels} />
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Quick demo flow
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
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
    </div>
  );
}
