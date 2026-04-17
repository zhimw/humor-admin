'use client';

import { useMemo, useState } from 'react';

export type DayBucket = { day: string; count: number; studyCount: number; nonStudyCount: number };

export type RangeKey = '24h' | '7d' | '14d' | '28d';

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  '24h': 1,
  '7d': 7,
  '14d': 14,
  '28d': 28,
};

type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; title: string; lines: string[] };

export function VotesPerDayChart({
  buckets28d,
  defaultRange = '7d',
  range: controlledRange,
  onRangeChange,
  showRangeSelect = true,
}: {
  buckets28d: DayBucket[];
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

  const view = useMemo(() => {
    const days = RANGE_TO_DAYS[range];
    return buckets28d.slice(-days);
  }, [buckets28d, range]);

  const totals = useMemo(() => {
    return view.reduce(
      (acc, b) => {
        acc.count += b.count;
        acc.study += b.studyCount;
        acc.nonStudy += b.nonStudyCount;
        return acc;
      },
      { count: 0, study: 0, nonStudy: 0 }
    );
  }, [view]);

  const max = useMemo(() => Math.max(...view.map((b) => b.count), 0), [view]);
  const isSingleBar = view.length === 1;
  const chartHeight = range === '24h' ? 92 : 132;
  const maxBarHeight = range === '24h' ? 84 : 122;
  const minPanelHeight = range === '24h' ? 0 : 260;

  return (
    <div className="card-muted" style={{ padding: '0.75rem', minHeight: minPanelHeight }}>
      <div className="section-header" style={{ marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'rgb(226 232 240)' }}>
          Votes per day
        </h3>
        {showRangeSelect ? (
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
        ) : null}
      </div>

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
            width: 240,
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

      {view.every((b) => b.count === 0) ? (
        <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)', margin: 0 }}>
          No votes in the selected range.
        </p>
      ) : (
        <div
          style={{
            display: isSingleBar ? 'flex' : 'grid',
            justifyContent: isSingleBar ? 'center' : undefined,
            gridTemplateColumns: isSingleBar ? undefined : `repeat(${view.length}, minmax(0, 1fr))`,
            gap: '0.5rem',
            alignItems: 'end',
          }}
        >
          {view.map((b) => {
            const h = max === 0 ? 0 : Math.max(8, Math.round((b.count / max) * maxBarHeight));
            const studyH = b.count === 0 ? 0 : Math.round((b.studyCount / b.count) * h);
            const nonStudyH = h - studyH;
            return (
              <div
                key={b.day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  textAlign: 'center',
                  ...(isSingleBar ? { width: 44 } : null),
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: chartHeight }}
                >
                  <div
                    onMouseEnter={(e) => {
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        title: `${b.day} (UTC)`,
                        lines: [
                          'Non-study votes',
                          `Count: ${b.nonStudyCount.toLocaleString()}`,
                          `Total (all): ${b.count.toLocaleString()}`,
                        ],
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t));
                    }}
                    onMouseLeave={() => setTooltip({ visible: false })}
                    style={{
                      height: nonStudyH,
                      background: 'rgba(96,165,250,0.55)',
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                      cursor: 'default',
                    }}
                  />
                  <div
                    onMouseEnter={(e) => {
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        title: `${b.day} (UTC)`,
                        lines: [
                          'Study votes',
                          `Count: ${b.studyCount.toLocaleString()}`,
                          `Total (all): ${b.count.toLocaleString()}`,
                        ],
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t));
                    }}
                    onMouseLeave={() => setTooltip({ visible: false })}
                    style={{
                      height: studyH,
                      background: 'rgba(52,211,153,0.65)',
                      borderBottomLeftRadius: 6,
                      borderBottomRightRadius: 6,
                      cursor: 'default',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgb(100 116 139)' }}>
                  {view.length <= 7 ? b.day.slice(5) : b.day.slice(8)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
        Selected range totals: <strong style={{ color: 'rgb(148 163 184)' }}>{totals.count.toLocaleString()}</strong> votes{' '}
        (<span style={{ color: 'rgb(52 211 153)' }}>{totals.study.toLocaleString()}</span> study,{' '}
        <span style={{ color: 'rgb(96 165 250)' }}>{totals.nonStudy.toLocaleString()}</span> non-study).
      </p>
    </div>
  );
}

