'use client';

import { useMemo, useState } from 'react';

type RangeKey = '7d' | '4w' | 'all';

export type MostRatedCaptionRow = {
  id: string;
  content: string | null;
  like_count: number | null;
  vote_count: number;
  image_url?: string | null;
};

export function MostRatedCaptions({
  last7d,
  last4w,
  allTime,
  defaultRange = '7d',
}: {
  last7d: MostRatedCaptionRow[];
  last4w: MostRatedCaptionRow[];
  allTime: MostRatedCaptionRow[];
  defaultRange?: RangeKey;
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);

  const data = useMemo(() => {
    switch (range) {
      case 'all':
        return allTime;
      case '4w':
        return last4w;
      case '7d':
      default:
        return last7d;
    }
  }, [allTime, last4w, last7d, range]);

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="section-header">
        <h2 className="section-title">Most-rated captions</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>Range</span>
          <select
            className="input"
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
          >
            <option value="7d">7 days</option>
            <option value="4w">4 weeks</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>

      {data.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)' }}>Not enough vote data in this range.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {data.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                borderBottom: '1px solid rgba(30,41,59,0.85)',
                paddingBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      objectFit: 'cover',
                      border: '1px solid rgba(30,41,59,0.9)',
                      background: 'rgba(15,23,42,0.6)',
                      flex: '0 0 auto',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      border: '1px solid rgba(30,41,59,0.9)',
                      background: 'rgba(15,23,42,0.6)',
                      flex: '0 0 auto',
                    }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgb(100 116 139)', marginBottom: '0.2rem' }}>#{i + 1}</div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgb(226 232 240)',
                      margin: 0,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {c.content}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                <span className="pill" style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(96 165 250)', display: 'inline-block' }} />
                  {c.vote_count ?? 0} votes
                </span>
                <span className="pill" style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(52 211 153)', display: 'inline-block' }} />
                  {c.like_count ?? 0} likes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

