import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { leagueQueryOptions, leagueLeaderboardQueryOptions } from '@/features/leagues/leagues.queries';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/leagues/$leagueId')({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const [league, leaderboard] = await Promise.all([
        queryClient.ensureQueryData(leagueQueryOptions(params.leagueId)),
        queryClient.ensureQueryData(leagueLeaderboardQueryOptions(params.leagueId)),
      ]);
      return { league, leaderboard };
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        throw redirect({ to: '/login' });
      }
      throw err;
    }
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: LeaguePage,
});

function LeaguePage() {
  const { league: leagueData, leaderboard: leaderboardData } = Route.useLoaderData();
  const { data: league } = useQuery({
    ...leagueQueryOptions(leagueData.id),
    initialData: leagueData,
  });
  const { data: leaderboard } = useQuery({
    ...leagueLeaderboardQueryOptions(leagueData.id),
    initialData: leaderboardData,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/leagues"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Leagues
          </Link>
          <h1 className="text-3xl font-bold mt-1">{league.name}</h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Invite code</p>
          <p className="font-mono font-bold text-lg tracking-widest">{league.inviteCode}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Members
        </h2>
        {leaderboard.map((entry, idx) => (
          <div key={entry.id} className="border p-4 rounded-xl flex items-center gap-4">
            <span className="text-muted-foreground w-8 text-right">{idx + 1}</span>
            <span className="flex-1 font-medium">{entry.name}</span>
            <span className="font-bold">{entry.points} pts</span>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p className="text-muted-foreground text-center py-8 text-sm">No members yet.</p>
        )}
      </div>
    </div>
  );
}
