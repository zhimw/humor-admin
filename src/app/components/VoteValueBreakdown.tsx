'use client';

import { useMemo, useState } from 'react';

export type RangeKey = '24h' | '7d' | '14d' | '28d';

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  '24h': 1,
  '7d': 7,
  '14d': 14,
  '28d': 28,
};

export type VoteSampleRow = {
  vote_value: number;
  created_datetime_utc: string;
};

type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; title: string; lines: string[] };

export function VoteValueBreakdown({
  voteSample28d,
  defaultRange = '7d',
  range: controlledRange,
  onRangeChange,
  showRangeSelect = true,
}: {
  voteSample28d: VoteSampleRow[];
  defaultRange?: RangeKey;
  range?: RangeKey;
  onRangeChange?: (range: RangeKey) => void;
  showRangeSelect?: boolean;
}) {
  const [rangeInternal, setRangeInternal] = useState<RangeKey>(defaultRange);
  const range = controlledRange ?? rangeInternal;
  const setRange = (next: RangeKey) => {
    if (controlledRange == null) setRangeInternal(next);
    onRangeChange?.(next);
  };
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false });

  const sinceIso = useMemo(() => {
    const days = RANGE_TO_DAYS[range];
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }, [range]);

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of voteSample28d) {
      if (r.created_datetime_utc < sinceIso) continue;
      m.set(r.vote_value, (m.get(r.vote_value) ?? 0) + 1);
    }
    return m;
  }, [voteSample28d, sinceIso]);

  const totalVotes = useMemo(() => {
    let t = 0;
    for (const c of counts.values()) t += c;
    return t;
  }, [counts]);

  const rows = useMemo(() => {
    // Display common scales in a stable order, but only if present
    const prefer = [-1, 0, 1, 2, 3, 4, 5];
    const present = new Set(counts.keys());
    const list = prefer.filter((v) => present.has(v));
    const extra = [...present].filter((v) => !prefer.includes(v)).sort((a, b) => b - a);
    const values = [...extra, ...list].sort((a, b) => b - a);
    return values.map((v) => ({ vote_value: v, count: counts.get(v) ?? 0 }));
  }, [counts]);

  const max = useMemo(() => Math.max(...rows.map((r) => r.count), 0), [rows]);

  return (
    <div className="card-muted" style={{ padding: '0.75rem' }}>
      <div className="section-header" style={{ marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'rgb(226 232 240)' }}>
          Vote value breakdown
        </h3>
        {showRangeSelect ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>Range</span>
              <select
                className="input"
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value="24h">24h</option>
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
                <option value="28d">28 days</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'rgb(100 116 139)', lineHeight: 1.5 }}>
        Shows how often each <strong style={{ color: 'rgb(148 163 184)', fontWeight: 600 }}>vote value</strong> was used in the selected range.
        Hover a bar to see exact counts and percent.
      </p>

      {tooltip.visible ? (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: 'rgba(2,6,23,0.92)',
            border: '1px solid rgba(30,41,59,0.9)',
            borderRadius: 10,
            padding: '0.5rem 0.6rem',
            zIndex: 9999,
            pointerEvents: 'none',
            width: 220,
            boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'rgb(226 232 240)', fontWeight: 600, marginBottom: '0.25rem' }}>
            {tooltip.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {tooltip.lines.map((line, idx) => (
              <div key={idx} style={{ fontSize: '0.72rem', color: 'rgb(148 163 184)' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)', margin: 0 }}>
          No caption votes in the selected range.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map((row) => {
            const w = max === 0 ? 0 : Math.max(6, Math.round((row.count / max) * 100));
            const pct = totalVotes === 0 ? 0 : (row.count / totalVotes) * 100;
            return (
              <div
                key={row.vote_value}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    title: `Vote ${row.vote_value}`,
                    lines: [`Count: ${row.count.toLocaleString()}`, `Share: ${pct.toFixed(1)}%`, `Range: ${range}`],
                  });
                }}
                onMouseMove={(e) => {
                  setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t));
                }}
                onMouseLeave={() => setTooltip({ visible: false })}
                style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto', alignItems: 'center', gap: '0.75rem' }}
              >
                <span style={{ color: 'rgb(203 213 225)', fontSize: '0.875rem' }}>{row.vote_value}</span>
                <div style={{ height: 10, background: 'rgba(30,41,59,0.85)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${w}%`, height: '100%', background: 'rgba(96,165,250,0.65)' }} />
                </div>
                <span className="pill" style={{ whiteSpace: 'nowrap' }}>{row.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
        Selected range totals: <strong style={{ color: 'rgb(148 163 184)' }}>{totalVotes.toLocaleString()}</strong> votes
      </p>
    </div>
  );
}

