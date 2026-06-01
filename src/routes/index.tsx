import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardQueryOptions } from '@/features/dashboard/dashboard.queries';
import type { RecentTip, UpcomingMatch, UserStats } from '@/features/dashboard/dashboard.repository';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(dashboardQueryOptions),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: Dashboard,
});

function Dashboard() {
  const loaderData = Route.useLoaderData();
  const { data } = useQuery({ ...dashboardQueryOptions, initialData: loaderData });
  const { upcomingMatches, userStats, recentTips } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {userStats ? `Welcome back, ${userStats.name.split(' ')[0]}` : 'Kickoff'}
        </h1>
        <p className="text-muted-foreground">FIFA World Cup 2026 Tipping Competition</p>
      </div>

      {userStats ? (
        <AuthenticatedDashboard
          userStats={userStats}
          recentTips={recentTips}
          upcomingMatches={upcomingMatches}
        />
      ) : (
        <UnauthenticatedDashboard upcomingMatches={upcomingMatches} />
      )}
    </div>
  );
}

function AuthenticatedDashboard({
  userStats,
  recentTips,
  upcomingMatches,
}: {
  userStats: UserStats;
  recentTips: RecentTip[];
  upcomingMatches: UpcomingMatch[];
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Your Points" value={`${userStats.points} pts`} />
        <StatCard label="Tips Submitted" value={String(userStats.totalTips)} />
        <StatCard label="Your Rank" value={`#${userStats.rank}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RecentTipsSection recentTips={recentTips} />
        <UpcomingMatchesSection upcomingMatches={upcomingMatches} />
      </div>
    </>
  );
}

function UnauthenticatedDashboard({ upcomingMatches }: { upcomingMatches: UpcomingMatch[] }) {
  return (
    <>
      <div className="border rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Join the competition</p>
          <p className="text-sm text-muted-foreground">Tip all 104 World Cup matches and climb the leaderboard</p>
        </div>
        <Link
          to="/login"
          className="py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shrink-0 ml-4"
        >
          Sign in
        </Link>
      </div>

      <UpcomingMatchesSection upcomingMatches={upcomingMatches} />
    </>
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

function RecentTipsSection({ recentTips }: { recentTips: RecentTip[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">Recent Tips</h2>
      {recentTips.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No tips yet.{' '}
          <Link to="/matches" className="underline underline-offset-2">
            Browse fixtures to start tipping
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {recentTips.map((tip) => (
            <Link
              key={tip.id}
              to="/matches/$matchId"
              params={{ matchId: tip.matchId }}
              className="border rounded-xl p-3 block hover:bg-accent transition-colors"
            >
              <div className="flex justify-between items-center text-sm font-medium">
                <span>
                  {tip.homeTeam} vs {tip.awayTeam}
                </span>
                {tip.matchStatus === 'completed' && (
                  <PointsBadge points={tip.pointsEarned} />
                )}
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                <span>
                  Your tip: {tip.predictedHomeScore}–{tip.predictedAwayScore}
                </span>
                {tip.matchStatus === 'completed' && tip.homeScore !== null && (
                  <span>· Result: {tip.homeScore}–{tip.awayScore}</span>
                )}
                {tip.matchStatus === 'live' && (
                  <span className="text-green-600 font-medium">· LIVE</span>
                )}
              </div>
            </Link>
          ))}
          <Link
            to="/matches"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            Browse all fixtures →
          </Link>
        </div>
      )}
    </div>
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
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colour}`}>
      {points} pt{points !== 1 ? 's' : ''}
    </span>
  );
}

function UpcomingMatchesSection({ upcomingMatches }: { upcomingMatches: UpcomingMatch[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">Upcoming Matches</h2>
      {upcomingMatches.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No upcoming matches.</p>
      ) : (
        <div className="space-y-2">
          {upcomingMatches.map((match) => (
            <Link
              key={match.id}
              to="/matches/$matchId"
              params={{ matchId: match.id }}
              className="border rounded-xl p-3 block hover:bg-accent transition-colors"
            >
              <div className="flex justify-between items-center text-sm font-medium">
                <span>
                  {match.homeTeam} vs {match.awayTeam}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(match.matchDate).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {match.group && (
                <p className="text-xs text-muted-foreground mt-0.5">Group {match.group}</p>
              )}
            </Link>
          ))}
          <Link
            to="/matches"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            Browse all fixtures →
          </Link>
        </div>
      )}
    </div>
  );
}
