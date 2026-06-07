import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { profileQueryOptions } from '@/features/profile/profile.queries';
import type { ProfileTip } from '@/features/profile/profile.repository';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/profile')({
  loader: async ({ context: { queryClient } }) => {
    try {
      return await queryClient.ensureQueryData(profileQueryOptions);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        throw redirect({ to: '/login' });
      }
      throw err;
    }
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: ProfilePage,
});

function ProfilePage() {
  const loaderData = Route.useLoaderData();
  const { data: profile } = useQuery({ ...profileQueryOptions, initialData: loaderData });

  if (!profile) return null;

  const completed = profile.tips.filter((t) => t.matchStatus === 'completed');
  const pending = profile.tips.filter((t) => t.matchStatus !== 'completed');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{profile.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Points" value={`${profile.points} pts`} />
        <StatCard label="Tips" value={String(profile.totalTips)} />
        <StatCard label="Rank" value={`#${profile.rank}`} />
      </div>

      {/* Tip history */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Tip History</h2>

        {profile.tips.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tips yet.{' '}
            <Link to="/matches" className="underline underline-offset-2">
              Browse fixtures to start tipping
            </Link>
            .
          </p>
        )}

        {pending.length > 0 && (
          <TipSection title="Upcoming & Live" tips={pending} />
        )}

        {completed.length > 0 && (
          <TipSection title="Completed" tips={completed} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TipSection({ title, tips }: { title: string; tips: ProfileTip[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {tips.map((tip) => (
        <TipRow key={tip.id} tip={tip} />
      ))}
    </div>
  );
}

function TipRow({ tip }: { tip: ProfileTip }) {
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: tip.matchId }}
      className="border rounded-xl p-4 flex items-center gap-4 hover:bg-accent transition-colors"
    >
      {/* Match */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {tip.homeTeam} vs {tip.awayTeam}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {tip.competitionName && (
            <span className="text-xs text-muted-foreground">{tip.competitionName}</span>
          )}
          {tip.group && (
            <span className="text-xs text-muted-foreground">Group {tip.group}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(tip.matchDate).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {tip.matchStatus === 'live' && (
            <span className="text-xs font-medium text-green-600">LIVE</span>
          )}
        </div>
      </div>

      {/* Scores */}
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">
          Tip: {tip.predictedHomeScore}–{tip.predictedAwayScore}
        </p>
        {tip.matchStatus === 'completed' && tip.homeScore !== null && tip.awayScore !== null && (
          <p className="text-xs text-muted-foreground">
            Result: {tip.homeScore}–{tip.awayScore}
          </p>
        )}
      </div>

      {/* Points badge — only once scoring has run (scoredAt set by cron) */}
      {tip.matchStatus === 'completed' && tip.scoredAt !== null && (
        <PointsBadge points={tip.pointsEarned} />
      )}
    </Link>
  );
}

function PointsBadge({ points }: { points: number }) {
  const colour =
    points === 3
      ? 'text-green-700 bg-green-50'
      : points === 1
        ? 'text-amber-700 bg-amber-50'
        : 'text-muted-foreground bg-muted';
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${colour}`}>
      {points} pt{points !== 1 ? 's' : ''}
    </span>
  );
}
