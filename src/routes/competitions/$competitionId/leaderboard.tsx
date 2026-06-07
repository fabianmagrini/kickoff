import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { leaderboardQueryOptions } from '@/features/leaderboard/leaderboard.queries';
import { competitionQueryOptions } from '@/features/competitions/competitions.queries';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/competitions/$competitionId/leaderboard')({
  loader: async ({ context: { queryClient }, params }) => {
    const { competitionId } = params;
    const [competition, rankings] = await Promise.all([
      queryClient.ensureQueryData(competitionQueryOptions(competitionId)),
      queryClient.ensureQueryData(leaderboardQueryOptions(competitionId)),
    ]);
    return { competition, rankings };
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: LeaderboardComponent,
});

function LeaderboardComponent() {
  const { competition, rankings: rankingsData } = Route.useLoaderData();
  const { params } = Route.useMatch();
  const { data: rankings } = useQuery({
    ...leaderboardQueryOptions(params.competitionId),
    initialData: rankingsData,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: params.competitionId }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {competition.name}
        </Link>
        <h1 className="text-3xl font-bold mt-1">Leaderboard</h1>
      </div>
      <div className="space-y-2">
        {rankings.map((user, idx) => (
          <div key={user.id} className="border p-4 rounded-xl flex items-center gap-4">
            <span className="text-muted-foreground w-8 text-right">{idx + 1}</span>
            <span className="flex-1 font-medium">{user.name}</span>
            <span className="font-bold">{user.points} pts</span>
          </div>
        ))}
        {rankings.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No scores yet. Start tipping!</p>
        )}
      </div>
    </div>
  );
}
