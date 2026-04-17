'use client';

export type ReportedImageRow = {
  id: number;
  created_datetime_utc: string;
  reason: string | null;
  image_url: string | null;
};

export type ReportedCaptionRow = {
  id: number;
  created_datetime_utc: string;
  reason: string | null;
  caption_content: string | null;
  image_url: string | null;
};

function fmtUtc(iso: string) {
  // Compact UTC time; avoids locale surprises.
  return iso.replace('T', ' ').replace('Z', ' UTC').slice(0, 20);
}

export function ModerationReportsCard({
  reportedImagesCount,
  reportedCaptionsCount,
  reportedImages,
  reportedCaptions,
}: {
  reportedImagesCount: number;
  reportedCaptionsCount: number;
  reportedImages: ReportedImageRow[];
  reportedCaptions: ReportedCaptionRow[];
}) {
  const total = reportedImagesCount + reportedCaptionsCount;
  const statusClass = total > 0 ? 'badge badge-danger' : 'badge badge-success';
  const statusLabel = total > 0 ? 'Needs review' : 'All clear';

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="section-header">
        <h2 className="section-title">Moderation reports</h2>
        <span className={statusClass}>{statusLabel}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(320px, 1.15fr) minmax(320px, 1.15fr)',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {/* Column 1: stats */}
        <div className="card-muted" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgb(226 232 240)' }}>Stats</div>
            <span className="pill" style={{ whiteSpace: 'nowrap' }}>{total.toLocaleString()} total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span style={{ color: 'rgb(203 213 225)' }}>Reported images</span>
              <span className="pill">
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(251 191 36)', display: 'inline-block' }} />
                {reportedImagesCount.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span style={{ color: 'rgb(203 213 225)' }}>Reported captions</span>
              <span className="pill">
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'rgb(248 113 113)', display: 'inline-block' }} />
                {reportedCaptionsCount.toLocaleString()}
              </span>
            </div>
          </div>
          <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>
            Lists show the latest 10 reports in each category.
          </p>
        </div>

        {/* Column 2: captions */}
        <div className="card-muted" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgb(226 232 240)' }}>Reported captions</div>
            <span className="badge">{Math.min(reportedCaptions.length, 10).toLocaleString()}</span>
          </div>

          {reportedCaptions.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)', margin: 0 }}>No reported captions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportedCaptions.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(30,41,59,0.85)',
                    paddingBottom: '0.6rem',
                  }}
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
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
                    <div style={{ fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>{fmtUtc(r.created_datetime_utc)}</div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'rgb(226 232 240)',
                        margin: '0.15rem 0 0 0',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {r.caption_content}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'rgb(148 163 184)', marginTop: '0.25rem' }}>
                      {r.reason?.trim() ? r.reason : <span style={{ color: 'rgb(100 116 139)' }}>No reason provided.</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: images */}
        <div className="card-muted" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgb(226 232 240)' }}>Reported images</div>
            <span className="badge">{Math.min(reportedImages.length, 10).toLocaleString()}</span>
          </div>

          {reportedImages.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'rgb(100 116 139)', margin: 0 }}>No reported images.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportedImages.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(30,41,59,0.85)',
                    paddingBottom: '0.6rem',
                  }}
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>{fmtUtc(r.created_datetime_utc)}</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgb(226 232 240)', marginTop: '0.15rem' }}>
                      {r.reason?.trim() ? r.reason : <span style={{ color: 'rgb(100 116 139)' }}>No reason provided.</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

