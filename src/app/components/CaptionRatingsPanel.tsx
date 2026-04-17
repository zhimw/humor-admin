'use client';

import React, { useMemo, useState } from 'react';
import { VotesPerDayChart, type DayBucket, type RangeKey as RatingsRangeKey } from './VotesPerDayChart';
import { VoteValueBreakdown } from './VoteValueBreakdown';

export type VoteSampleDetailedRow = {
  caption_id: string;
  profile_id: string;
  vote_value: number;
  created_datetime_utc: string;
  is_from_study: boolean;
};

type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; title: string; lines: string[] };

function rangeToDays(range: RatingsRangeKey) {
  switch (range) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '14d':
      return 14;
    case '28d':
      return 28;
  }
}

export function CaptionRatingsPanel({
  // all-time / server computed totals
  captionVotesTotal,
  captionVotesFromStudy,
  captionVotesNonStudy,
  captionVotesLast24h,
  studyCaptionVoteEventsTotal,
  studyCaptionVoteEventsLast24h,
  publicCaptions,
  publicCaptionShare,
  featuredCaptions,
  featuredCaptionShare,
  captionsCreated24h,
  captionsCreated7d,
  captionsCreated14d,
  captionsCreated28d,

  // range-computable sources
  buckets28d,
  voteSample28dDetailed,
  defaultRange = '7d',
}: {
  captionVotesTotal: number;
  captionVotesFromStudy: number;
  captionVotesNonStudy: number;
  captionVotesLast24h: number;
  studyCaptionVoteEventsTotal: number;
  studyCaptionVoteEventsLast24h: number;
  publicCaptions: number;
  publicCaptionShare: number | null;
  featuredCaptions: number;
  featuredCaptionShare: number | null;
  captionsCreated24h: number;
  captionsCreated7d: number;
  captionsCreated14d: number;
  captionsCreated28d: number;
  buckets28d: DayBucket[];
  voteSample28dDetailed: VoteSampleDetailedRow[];
  defaultRange?: RatingsRangeKey;
}) {
  const [range, setRange] = useState<RatingsRangeKey>(defaultRange);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false });

  const rangeDays = useMemo(() => rangeToDays(range), [range]);

  const captionsCreatedInRange = useMemo(() => {
    switch (range) {
      case '24h':
        return captionsCreated24h;
      case '7d':
        return captionsCreated7d;
      case '14d':
        return captionsCreated14d;
      case '28d':
        return captionsCreated28d;
    }
  }, [captionsCreated14d, captionsCreated24h, captionsCreated28d, captionsCreated7d, range]);

  const captionsPerDayInRange = useMemo(() => {
    if (!rangeDays) return null;
    return captionsCreatedInRange / rangeDays;
  }, [captionsCreatedInRange, rangeDays]);

  const sinceIso = useMemo(() => {
    return new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  }, [range, rangeDays]);

  const voteSampleInRange = useMemo(() => {
    return voteSample28dDetailed.filter((r) => r.created_datetime_utc >= sinceIso);
  }, [sinceIso, voteSample28dDetailed]);

  const uniqueRaters = useMemo(() => new Set(voteSampleInRange.map((r) => r.profile_id)).size, [voteSampleInRange]);
  const uniqueCaptionsRated = useMemo(() => new Set(voteSampleInRange.map((r) => r.caption_id)).size, [voteSampleInRange]);

  const votesInRange = voteSampleInRange.length;
  const studyVotesInRange = useMemo(() => voteSampleInRange.reduce((acc, r) => acc + (r.is_from_study ? 1 : 0), 0), [voteSampleInRange]);
  const nonStudyVotesInRange = votesInRange - studyVotesInRange;
  const studyShare = votesInRange === 0 ? null : studyVotesInRange / votesInRange;

  const peakDay = useMemo(() => {
    const days = rangeToDays(range);
    const view = buckets28d.slice(-days);
    const peak = view.reduce((best, b) => (b.count > best.count ? b : best), { day: '', count: 0, studyCount: 0, nonStudyCount: 0 });
    return peak.day ? { day: peak.day, count: peak.count } : null;
  }, [buckets28d, range]);

  const modeVoteValue = useMemo(() => {
    if (voteSampleInRange.length === 0) return null;
    const m = new Map<number, number>();
    for (const r of voteSampleInRange) m.set(r.vote_value, (m.get(r.vote_value) ?? 0) + 1);
    let bestVal: number | null = null;
    let bestCount = -1;
    for (const [v, c] of m.entries()) {
      if (c > bestCount) {
        bestVal = v;
        bestCount = c;
      }
    }
    return bestVal;
  }, [voteSampleInRange]);

  const voteSampleForBreakdown = useMemo(() => {
    return voteSample28dDetailed.map((r) => ({ vote_value: r.vote_value, created_datetime_utc: r.created_datetime_utc }));
  }, [voteSample28dDetailed]);

  const tooltipBox = tooltip.visible ? (
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
        width: 260,
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
  ) : null;

  const tooltipHandlers = (title: string, lines: string[]) => ({
    onMouseEnter: (e: React.MouseEvent) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, title, lines }),
    onMouseMove: (e: React.MouseEvent) =>
      setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t)),
    onMouseLeave: () => setTooltip({ visible: false }),
  });

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="section-header">
        <h2 className="section-title">Caption ratings</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="badge">{captionVotesLast24h.toLocaleString()} last 24h</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>Range</span>
            <select
              className="input"
              value={range}
              onChange={(e) => setRange(e.target.value as RatingsRangeKey)}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="24h">24h</option>
              <option value="7d">7 days</option>
              <option value="14d">14 days</option>
              <option value="28d">28 days</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {tooltipBox}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Public captions', [
              'Count of captions with captions.is_public = TRUE.',
              publicCaptionShare == null ? 'Share: —' : `Share: ${Math.round(publicCaptionShare * 100)}% of all captions.`,
            ])}
          >
            <div className="stat-label">Public captions</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{publicCaptions.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              {publicCaptionShare == null ? '—' : `${Math.round(publicCaptionShare * 100)}%`} of all captions
            </p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Featured captions', [
              'Count of captions with captions.is_featured = TRUE.',
              featuredCaptionShare == null ? 'Share: —' : `Share: ${Math.round(featuredCaptionShare * 100)}% of all captions.`,
            ])}
          >
            <div className="stat-label">Featured captions</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{featuredCaptions.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              {featuredCaptionShare == null ? '—' : `${Math.round(featuredCaptionShare * 100)}%`} of all captions
            </p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('New captions', [
              'Captions created within the selected range.',
              `Range: ${range} (${rangeDays} day${rangeDays === 1 ? '' : 's'})`,
            ])}
          >
            <div className="stat-label">New captions</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{captionsCreatedInRange.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>Created in selected range</p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('New captions / day', [
              'Average new captions per day in the selected range.',
              captionsPerDayInRange == null ? 'Value: —' : `Value: ${captionsPerDayInRange.toFixed(1)} per day`,
            ])}
          >
            <div className="stat-label">New captions / day</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>
              {captionsPerDayInRange == null ? '—' : captionsPerDayInRange.toFixed(1)}
            </div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>Average in selected range</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Total caption votes', [
              'All-time count of rows in caption_votes.',
              `Study: ${captionVotesFromStudy.toLocaleString()}`,
              `Non-study: ${captionVotesNonStudy.toLocaleString()}`,
            ])}
          >
            <div className="stat-label">Total caption votes</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{captionVotesTotal.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              Study: {captionVotesFromStudy.toLocaleString()} · Non-study: {captionVotesNonStudy.toLocaleString()}
            </p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Study vote events', [
              'All-time count of study_caption_vote_events.',
              `Last 24h: ${studyCaptionVoteEventsLast24h.toLocaleString()}`,
            ])}
          >
            <div className="stat-label">Study vote events</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{studyCaptionVoteEventsTotal.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              {studyCaptionVoteEventsLast24h.toLocaleString()} last 24h
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Unique raters', [
              'Distinct profile_id values in the vote sample, filtered to the selected range.',
              'Sample-based (last 28d, capped on the server).',
            ])}
          >
            <div className="stat-label">Unique raters</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{uniqueRaters.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>In selected range (sample-based)</p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Unique captions rated', [
              'Distinct caption_id values in the vote sample, filtered to the selected range.',
              'Sample-based (last 28d, capped on the server).',
            ])}
          >
            <div className="stat-label">Unique captions rated</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{uniqueCaptionsRated.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>In selected range (sample-based)</p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Votes', [
              'Vote rows in the sample within the selected range.',
              `Study: ${studyVotesInRange.toLocaleString()} · Non-study: ${nonStudyVotesInRange.toLocaleString()}`,
            ])}
          >
            <div className="stat-label">Votes</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{votesInRange.toLocaleString()}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              Study {studyVotesInRange.toLocaleString()} · Non-study {nonStudyVotesInRange.toLocaleString()}
            </p>
          </div>
          <div
            className="card-muted"
            style={{ padding: '0.75rem' }}
            {...tooltipHandlers('Study share', [
              'Share of votes in the selected range where caption_votes.is_from_study = TRUE.',
              peakDay ? `Peak day: ${peakDay.day} (${peakDay.count.toLocaleString()})` : 'Peak day: —',
              modeVoteValue == null ? 'Mode vote value: —' : `Mode vote value: ${modeVoteValue}`,
            ])}
          >
            <div className="stat-label">Study share</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{studyShare == null ? '—' : `${Math.round(studyShare * 100)}%`}</div>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
              Peak {peakDay ? `${peakDay.day.slice(5)} (${peakDay.count})` : '—'} · Mode {modeVoteValue == null ? '—' : modeVoteValue}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
          <VotesPerDayChart buckets28d={buckets28d} range={range} onRangeChange={setRange} showRangeSelect={false} />
          <VoteValueBreakdown voteSample28d={voteSampleForBreakdown} range={range} onRangeChange={setRange} showRangeSelect={false} />
        </div>
      </div>
    </div>
  );
}

