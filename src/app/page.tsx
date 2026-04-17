import { requireSuperadmin } from '../lib/supabase/server';
import { VotesPerDayChart, type DayBucket as DayBucketClient } from './components/VotesPerDayChart';
import { VoteValueBreakdown, type VoteSampleRow as VoteSampleRowClient } from './components/VoteValueBreakdown';
import { TopLikedCaptions, type CaptionRow as TopLikedCaptionRow } from './components/TopLikedCaptions';
import { MostRatedCaptions, type MostRatedCaptionRow } from './components/MostRatedCaptions';
import { CaptionRatingsPanel, type VoteSampleDetailedRow } from './components/CaptionRatingsPanel';
import { ModerationReportsCard, type ReportedCaptionRow, type ReportedImageRow } from './components/ModerationReportsCard';

// ─── Sub-views ────────────────────────────────────────────────────────────────

function LoginView() {
  return (
    <div className="login-page">
      <div className="auth-card">
        <div style={{ fontSize: '2rem' }}>🔐</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
          Sign in required
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(148 163 184)', lineHeight: 1.6 }}>
          Sign in with your Google account to access the Humor Admin panel.
        </p>
        <a href="/api/auth/signin" className="signin-link">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function AccessDeniedView({ email }: { email?: string }) {
  return (
    <div className="login-page">
      <div className="auth-card">
        <div style={{ fontSize: '2rem' }}>🚫</div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
          Access denied
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(148 163 184)', lineHeight: 1.6 }}>
          Signed in as <strong style={{ color: 'rgb(226 232 240)' }}>{email ?? 'unknown'}</strong>,
          but this account does not have superadmin access.
          Ask an existing superadmin to set{' '}
          <code style={{ color: 'rgb(148 163 184)', fontSize: '0.8rem' }}>profiles.is_superadmin = TRUE</code>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="button-secondary">Sign out</button>
          </form>
          <a href="/api/auth/signin" className="signin-link">
            Sign in with a different account
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard stats ───────────────────────────────────────────────────────────

type CaptionVoteBreakdownRow = { vote_value: number; count: number };
type VoteSampleRow = {
  caption_id: string;
  profile_id: string;
  vote_value: number;
  created_datetime_utc: string;
  is_from_study: boolean;
};

type CaptionWithImageId = {
  id: string;
  content: string | null;
  like_count: number | null;
  image_id: string | null;
};

function attachImageUrls<T extends { image_id?: string | null }>(
  rows: T[],
  urlByImageId: Map<string, string>
): (T & { image_url?: string | null })[] {
  return rows.map((r) => {
    const imageId = r.image_id ?? null;
    const image_url = imageId ? urlByImageId.get(imageId) ?? null : null;
    return { ...r, image_url };
  });
}

type DayBucket = DayBucketClient;

function computeVoteBreakdown(values: number[], countsByValue: Map<number, number>): CaptionVoteBreakdownRow[] {
  const rows: CaptionVoteBreakdownRow[] = [];
  for (const v of values) {
    const c = countsByValue.get(v) ?? 0;
    if (c > 0) rows.push({ vote_value: v, count: c });
  }
  rows.sort((a, b) => b.vote_value - a.vote_value);
  return rows;
}

function computeWeightedAverage(rows: CaptionVoteBreakdownRow[]): number | null {
  const denom = rows.reduce((acc, r) => acc + r.count, 0);
  if (denom === 0) return null;
  const numer = rows.reduce((acc, r) => acc + r.vote_value * r.count, 0);
  return numer / denom;
}

function isoDay(iso: string) {
  // iso is already UTC; we bucket by UTC day to match *_datetime_utc columns.
  return iso.slice(0, 10);
}

function buildDayBuckets(days: number): DayBucket[] {
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, count: 0, studyCount: 0, nonStudyCount: 0 });
  }
  return out;
}

async function getDashboardStats(supabase: Awaited<ReturnType<typeof requireSuperadmin>>['supabase']) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since28d = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const captionSince24h = since24h;
  const captionSince7d = since7d;

  const voteValuesToCount = [-1, 0, 1, 2, 3, 4, 5];
  const voteValueCountQueries = voteValuesToCount.map((v) =>
    supabase.from('caption_votes').select('id', { count: 'exact', head: true }).eq('vote_value', v)
  );

  const voteSampleLimit = 5000;
  const voteSampleAllTimeLimit = 20000;
  const [
    profiles,
    images,
    captions,
    publicCaptions,
    featuredCaptions,
    captionsLast24h,
    captionsLast7d,
    reportedImages,
    reportedCaptions,
    reportedImagesLatest,
    reportedCaptionsLatest,
    studies,
    topCaptionsAllTime,
    topCaptions7d,
    topCaptions4w,

    captionVotesTotal,
    captionVotesFromStudy,
    captionVotesNonStudy,
    captionVotesLast24h,
    captionVotesFromStudyLast24h,
    captionVotesNonStudyLast24h,

    studyCaptionVoteEventsTotal,
    studyCaptionVoteEventsLast24h,

    recentVotes,
    recentVotesAllTime,

    ...voteValueCounts
  ] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('images').select('id', { count: 'exact', head: true }),
      supabase.from('captions').select('id', { count: 'exact', head: true }),
      supabase.from('captions').select('id', { count: 'exact', head: true }).eq('is_public', true),
      supabase.from('captions').select('id', { count: 'exact', head: true }).eq('is_featured', true),
      supabase.from('captions').select('id', { count: 'exact', head: true }).gte('created_datetime_utc', captionSince24h),
      supabase.from('captions').select('id', { count: 'exact', head: true }).gte('created_datetime_utc', captionSince7d),
      supabase.from('reported_images').select('id', { count: 'exact', head: true }),
      supabase.from('reported_captions').select('id', { count: 'exact', head: true }),
      supabase
        .from('reported_images')
        .select('id, image_id, reason, created_datetime_utc')
        .order('created_datetime_utc', { ascending: false })
        .limit(10),
      supabase
        .from('reported_captions')
        .select('id, caption_id, reason, created_datetime_utc')
        .order('created_datetime_utc', { ascending: false })
        .limit(10),
      supabase.from('studies').select('id', { count: 'exact', head: true }),
      supabase.from('captions').select('id, content, like_count, image_id').order('like_count', { ascending: false }).limit(5),
      supabase
        .from('captions')
        .select('id, content, like_count, image_id')
        .gte('created_datetime_utc', captionSince7d)
        .order('like_count', { ascending: false })
        .limit(5),
      supabase
        .from('captions')
        .select('id, content, like_count, image_id')
        .gte('created_datetime_utc', since28d)
        .order('like_count', { ascending: false })
        .limit(5),

      supabase.from('caption_votes').select('id', { count: 'exact', head: true }),
      supabase.from('caption_votes').select('id', { count: 'exact', head: true }).eq('is_from_study', true),
      supabase.from('caption_votes').select('id', { count: 'exact', head: true }).eq('is_from_study', false),
      supabase.from('caption_votes').select('id', { count: 'exact', head: true }).gte('created_datetime_utc', since24h),
      supabase
        .from('caption_votes')
        .select('id', { count: 'exact', head: true })
        .eq('is_from_study', true)
        .gte('created_datetime_utc', since24h),
      supabase
        .from('caption_votes')
        .select('id', { count: 'exact', head: true })
        .eq('is_from_study', false)
        .gte('created_datetime_utc', since24h),

      supabase.from('study_caption_vote_events').select('id', { count: 'exact', head: true }),
      supabase.from('study_caption_vote_events').select('id', { count: 'exact', head: true }).gte('created_datetime_utc', since24h),

      supabase
        .from('caption_votes')
        .select('caption_id, profile_id, vote_value, created_datetime_utc, is_from_study')
        .gte('created_datetime_utc', since28d)
        .order('created_datetime_utc', { ascending: false })
        .limit(voteSampleLimit),

      supabase
        .from('caption_votes')
        .select('caption_id, created_datetime_utc, is_from_study')
        .order('created_datetime_utc', { ascending: false })
        .limit(voteSampleAllTimeLimit),

      ...voteValueCountQueries,
    ]);

  const countsByValue = new Map<number, number>();
  voteValueCounts.forEach((res, idx) => {
    const v = voteValuesToCount[idx];
    countsByValue.set(v, res.count ?? 0);
  });

  const voteBreakdown = computeVoteBreakdown(voteValuesToCount, countsByValue);
  const voteAverage = computeWeightedAverage(voteBreakdown);

  const voteSample: VoteSampleRow[] = (recentVotes.data ?? []) as any;
  const voteSampleAllTime: Array<{ caption_id: string; created_datetime_utc: string; is_from_study: boolean }> =
    (recentVotesAllTime.data ?? []) as any;

  const reportedImagesRows = (reportedImagesLatest.data ?? []) as Array<{
    id: number;
    image_id: string | null;
    reason: string | null;
    created_datetime_utc: string;
  }>;
  const reportedCaptionsRows = (reportedCaptionsLatest.data ?? []) as Array<{
    id: number;
    caption_id: string | null;
    reason: string | null;
    created_datetime_utc: string;
  }>;
  const voteSampleTotal7d = voteSample.length;
  const voteSampleStudy7d = voteSample.reduce((acc, r) => acc + (r.is_from_study ? 1 : 0), 0);
  const voteSampleNonStudy7d = voteSampleTotal7d - voteSampleStudy7d;
  const voteSample7d = voteSample.filter((r) => r.created_datetime_utc >= since7d);
  const uniqueRaters7d = new Set(voteSample7d.map((r) => r.profile_id)).size;
  const uniqueCaptionsRated7d = new Set(voteSample7d.map((r) => r.caption_id)).size;

  const buckets28 = buildDayBuckets(28);
  const bucketIndex = new Map<string, DayBucket>();
  buckets28.forEach((b) => bucketIndex.set(b.day, b));
  for (const r of voteSample) {
    const b = bucketIndex.get(isoDay(r.created_datetime_utc));
    if (!b) continue;
    b.count += 1;
    if (r.is_from_study) b.studyCount += 1;
    else b.nonStudyCount += 1;
  }

  const buckets7 = buckets28.slice(-7);
  const peakDay = buckets7.reduce(
    (best, b) => (b.count > best.count ? b : best),
    { day: '', count: 0, studyCount: 0, nonStudyCount: 0 } as DayBucket
  );

  const mostCommonVoteValue =
    voteBreakdown.length === 0 ? null : voteBreakdown.reduce((best, r) => (r.count > best.count ? r : best), voteBreakdown[0]).vote_value;

  const votesPerCaption7d = new Map<string, number>();
  for (const r of voteSample7d) {
    votesPerCaption7d.set(r.caption_id, (votesPerCaption7d.get(r.caption_id) ?? 0) + 1);
  }
  const top7dIds = [...votesPerCaption7d.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const votesPerCaption4w = new Map<string, number>();
  for (const r of voteSample) {
    votesPerCaption4w.set(r.caption_id, (votesPerCaption4w.get(r.caption_id) ?? 0) + 1);
  }
  const top4wIds = [...votesPerCaption4w.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const votesPerCaptionAllTime = new Map<string, number>();
  for (const r of voteSampleAllTime) {
    votesPerCaptionAllTime.set(r.caption_id, (votesPerCaptionAllTime.get(r.caption_id) ?? 0) + 1);
  }
  const topAllTimeIds = [...votesPerCaptionAllTime.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const unionMostRatedIds = Array.from(new Set([...top7dIds, ...top4wIds, ...topAllTimeIds]));
  const mostRatedCaptionsBase =
    unionMostRatedIds.length === 0
      ? []
      : (
          await supabase
            .from('captions')
            .select('id, content, like_count, image_id')
            .in('id', unionMostRatedIds)
        ).data ?? [];

  const topLikedAllTimeRaw = (topCaptionsAllTime.data ?? []) as CaptionWithImageId[];
  const topLiked7dRaw = (topCaptions7d.data ?? []) as CaptionWithImageId[];
  const topLiked4wRaw = (topCaptions4w.data ?? []) as CaptionWithImageId[];
  const mostRatedRaw = (mostRatedCaptionsBase as any[]) as CaptionWithImageId[];

  const imageIds = Array.from(
    new Set(
      [...topLikedAllTimeRaw, ...topLiked7dRaw, ...topLiked4wRaw, ...mostRatedRaw]
        .map((c) => c.image_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const imagesForCaptions =
    imageIds.length === 0
      ? []
      : (
          await supabase
            .from('images')
            .select('id, url')
            .in('id', imageIds)
        ).data ?? [];

  const urlByImageId = new Map<string, string>();
  (imagesForCaptions as any[]).forEach((img) => {
    if (img?.id && img?.url) urlByImageId.set(img.id, img.url);
  });

  const mostRatedCaptions7dSample: MostRatedCaptionRow[] = top7dIds
    .map((id) => {
      const c = (mostRatedCaptionsBase as any[]).find((x) => x.id === id);
      return {
        id,
        content: c?.content ?? null,
        like_count: c?.like_count ?? 0,
        vote_count: votesPerCaption7d.get(id) ?? 0,
        image_url: c?.image_id ? urlByImageId.get(c.image_id) ?? null : null,
      };
    })
    .filter((r) => r.vote_count > 0);

  const mostRatedCaptions4wSample: MostRatedCaptionRow[] = top4wIds
    .map((id) => {
      const c = (mostRatedCaptionsBase as any[]).find((x) => x.id === id);
      return {
        id,
        content: c?.content ?? null,
        like_count: c?.like_count ?? 0,
        vote_count: votesPerCaption4w.get(id) ?? 0,
        image_url: c?.image_id ? urlByImageId.get(c.image_id) ?? null : null,
      };
    })
    .filter((r) => r.vote_count > 0);

  const mostRatedCaptionsAllTimeSample: MostRatedCaptionRow[] = topAllTimeIds
    .map((id) => {
      const c = (mostRatedCaptionsBase as any[]).find((x) => x.id === id);
      return {
        id,
        content: c?.content ?? null,
        like_count: c?.like_count ?? 0,
        vote_count: votesPerCaptionAllTime.get(id) ?? 0,
        image_url: c?.image_id ? urlByImageId.get(c.image_id) ?? null : null,
      };
    })
    .filter((r) => r.vote_count > 0);

  const topCaptionsAllTimeWithImages = attachImageUrls(topLikedAllTimeRaw, urlByImageId).map(({ image_id, ...rest }) => rest);
  const topCaptions7dWithImages = attachImageUrls(topLiked7dRaw, urlByImageId).map(({ image_id, ...rest }) => rest);
  const topCaptions4wWithImages = attachImageUrls(topLiked4wRaw, urlByImageId).map(({ image_id, ...rest }) => rest);

  // ─── Moderation drill-down lists ─────────────────────────────────────────────
  const moderationImageIds = Array.from(
    new Set(reportedImagesRows.map((r) => r.image_id).filter((id): id is string => Boolean(id)))
  );
  const moderationCaptionIds = Array.from(
    new Set(reportedCaptionsRows.map((r) => r.caption_id).filter((id): id is string => Boolean(id)))
  );

  const moderationImages =
    moderationImageIds.length === 0
      ? []
      : (
          await supabase
            .from('images')
            .select('id, url')
            .in('id', moderationImageIds)
        ).data ?? [];

  const moderationCaptions =
    moderationCaptionIds.length === 0
      ? []
      : (
          await supabase
            .from('captions')
            .select('id, content, image_id')
            .in('id', moderationCaptionIds)
        ).data ?? [];

  const moderationCaptionImageIds = Array.from(
    new Set((moderationCaptions as any[]).map((c) => c.image_id).filter((id): id is string => Boolean(id)))
  );
  const moderationCaptionImages =
    moderationCaptionImageIds.length === 0
      ? []
      : (
          await supabase
            .from('images')
            .select('id, url')
            .in('id', moderationCaptionImageIds)
        ).data ?? [];

  const moderationUrlByImageId = new Map<string, string>();
  (moderationImages as any[]).forEach((img) => {
    if (img?.id && img?.url) moderationUrlByImageId.set(img.id, img.url);
  });
  (moderationCaptionImages as any[]).forEach((img) => {
    if (img?.id && img?.url) moderationUrlByImageId.set(img.id, img.url);
  });

  const captionById = new Map<string, { content: string | null; image_id: string | null }>();
  (moderationCaptions as any[]).forEach((c) => {
    if (c?.id) captionById.set(c.id, { content: c.content ?? null, image_id: c.image_id ?? null });
  });

  const reportedImagesDetail: ReportedImageRow[] = reportedImagesRows.map((r) => ({
    id: r.id,
    created_datetime_utc: r.created_datetime_utc,
    reason: r.reason,
    image_url: r.image_id ? moderationUrlByImageId.get(r.image_id) ?? null : null,
  }));

  const reportedCaptionsDetail: ReportedCaptionRow[] = reportedCaptionsRows.map((r) => {
    const cap = r.caption_id ? captionById.get(r.caption_id) : undefined;
    const imgUrl = cap?.image_id ? moderationUrlByImageId.get(cap.image_id) ?? null : null;
    return {
      id: r.id,
      created_datetime_utc: r.created_datetime_utc,
      reason: r.reason,
      caption_content: cap?.content ?? null,
      image_url: imgUrl,
    };
  });

  return {
    profiles: profiles.count ?? 0,
    images: images.count ?? 0,
    captions: captions.count ?? 0,
    publicCaptions: publicCaptions.count ?? 0,
    featuredCaptions: featuredCaptions.count ?? 0,
    captionsLast24h: captionsLast24h.count ?? 0,
    captionsLast7d: captionsLast7d.count ?? 0,
    reportedImages: reportedImages.count ?? 0,
    reportedCaptions: reportedCaptions.count ?? 0,
    reportedImagesDetail,
    reportedCaptionsDetail,
    studies: studies.count ?? 0,
    topCaptionsAllTime: topCaptionsAllTimeWithImages as TopLikedCaptionRow[],
    topCaptions7d: topCaptions7dWithImages as TopLikedCaptionRow[],
    topCaptions4w: topCaptions4wWithImages as TopLikedCaptionRow[],

    captionVotesTotal: captionVotesTotal.count ?? 0,
    captionVotesFromStudy: captionVotesFromStudy.count ?? 0,
    captionVotesNonStudy: captionVotesNonStudy.count ?? 0,
    captionVotesLast24h: captionVotesLast24h.count ?? 0,
    captionVotesFromStudyLast24h: captionVotesFromStudyLast24h.count ?? 0,
    captionVotesNonStudyLast24h: captionVotesNonStudyLast24h.count ?? 0,

    studyCaptionVoteEventsTotal: studyCaptionVoteEventsTotal.count ?? 0,
    studyCaptionVoteEventsLast24h: studyCaptionVoteEventsLast24h.count ?? 0,

    captionVoteValueBreakdown: voteBreakdown,
    captionVoteAverage: voteAverage,

    captionVotesSampleLimit: voteSampleLimit,
    voteSampleTotal7d,
    voteSampleStudy7d,
    voteSampleNonStudy7d,
    voteSampleStudyShare7d: voteSampleTotal7d === 0 ? null : voteSampleStudy7d / voteSampleTotal7d,
    uniqueRaters7d,
    uniqueCaptionsRated7d,
    votesPerDay28d: buckets28,
    peakVoteDay7d: peakDay.day ? { day: peakDay.day, count: peakDay.count } : null,
    mostCommonVoteValue,
    mostRatedCaptions7dSample,
    mostRatedCaptions4wSample,
    mostRatedCaptionsAllTimeSample,

    publicCaptionShare: (captions.count ?? 0) === 0 ? null : (publicCaptions.count ?? 0) / (captions.count ?? 0),
    featuredCaptionShare: (captions.count ?? 0) === 0 ? null : (featuredCaptions.count ?? 0) / (captions.count ?? 0),

    voteSample28d: voteSample.map((r) => ({ vote_value: r.vote_value, created_datetime_utc: r.created_datetime_utc })) as VoteSampleRowClient[],
    voteSample28dDetailed: voteSample as VoteSampleDetailedRow[],
  };
}

async function DashboardView({
  profile,
  supabase,
}: {
  profile: Awaited<ReturnType<typeof requireSuperadmin>>['profile'];
  supabase: Awaited<ReturnType<typeof requireSuperadmin>>['supabase'];
}) {
  const stats = await getDashboardStats(supabase);
  const moderationLoad = stats.reportedImages + stats.reportedCaptions;
  const displayName =
    profile.first_name || profile.last_name
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : profile.email ?? 'Superadmin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'rgb(248 250 252)' }}>
            Welcome back, {displayName}.
          </h1>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'rgb(148 163 184)' }}>
            Superadmin access verified — <code style={{ color: 'rgb(226 232 240)' }}>profiles.is_superadmin = TRUE</code>.
          </p>
        </div>
        <span className="badge badge-success">Superadmin</span>
      </header>

      {/* Stat tiles */}
      <section className="card-muted">
        <div className="section-header">
          <h2 className="section-title">Platform pulse</h2>
        </div>
        <div className="stat-grid">
          {[
            { label: 'Total users', value: stats.profiles, note: 'Signed-up profiles' },
            { label: 'Images uploaded', value: stats.images, note: 'Raw material for jokes' },
            { label: 'Captions generated', value: stats.captions, note: 'AI jokes produced so far' },
            { label: 'Active studies', value: stats.studies, note: 'Live research experiments' },
          ].map((s) => (
            <div key={s.label} className="card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value.toLocaleString()}</div>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Moderation + top captions */}
      <section
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'start',
        }}
      >
        <ModerationReportsCard
          reportedImagesCount={stats.reportedImages}
          reportedCaptionsCount={stats.reportedCaptions}
          reportedImages={stats.reportedImagesDetail}
          reportedCaptions={stats.reportedCaptionsDetail}
        />

        <CaptionRatingsPanel
          captionVotesTotal={stats.captionVotesTotal}
          captionVotesFromStudy={stats.captionVotesFromStudy}
          captionVotesNonStudy={stats.captionVotesNonStudy}
          captionVotesLast24h={stats.captionVotesLast24h}
          studyCaptionVoteEventsTotal={stats.studyCaptionVoteEventsTotal}
          studyCaptionVoteEventsLast24h={stats.studyCaptionVoteEventsLast24h}
          buckets28d={stats.votesPerDay28d}
          voteSample28dDetailed={stats.voteSample28dDetailed}
          defaultRange="7d"
        />

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="section-header">
            <h2 className="section-title">Caption stats</h2>
          </div>
          <div className="stat-grid" style={{ marginBottom: '1rem' }}>
            {[
              { label: 'Public captions', value: stats.publicCaptions, note: `captions.is_public = TRUE${stats.publicCaptionShare == null ? '' : ` (${Math.round(stats.publicCaptionShare * 100)}%)`}` },
              { label: 'Featured captions', value: stats.featuredCaptions, note: `captions.is_featured = TRUE${stats.featuredCaptionShare == null ? '' : ` (${Math.round(stats.featuredCaptionShare * 100)}%)`}` },
              { label: 'New captions (24h)', value: stats.captionsLast24h, note: 'created in last 24h' },
              { label: 'New captions (7d)', value: stats.captionsLast7d, note: 'created in last 7d' },
            ].map((s) => (
              <div key={s.label} className="card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value.toLocaleString()}</div>
                <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'rgb(100 116 139)' }}>{s.note}</p>
              </div>
            ))}
          </div>
        </div>

        <TopLikedCaptions
          allTime={stats.topCaptionsAllTime}
          last7d={stats.topCaptions7d}
          last4w={stats.topCaptions4w}
          defaultRange="all"
        />

        <MostRatedCaptions
          last7d={stats.mostRatedCaptions7dSample}
          last4w={stats.mostRatedCaptions4wSample}
          allTime={stats.mostRatedCaptionsAllTimeSample}
          defaultRange="7d"
        />
      </section>
    </div>
  );
}

// ─── Root page ─────────────────────────────────────────────────────────────────

export default async function AdminRoot() {
  try {
    const { supabase, profile, user } = await requireSuperadmin();
    return <DashboardView profile={profile} supabase={supabase} />;
  } catch {
    // If auth middleware redirected, Next throws; fallback to safe views if it didn't.
    return <LoginView />;
  }
}
