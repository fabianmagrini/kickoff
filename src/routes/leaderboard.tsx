import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboardFn } from '@/features/leaderboard/leaderboard.server';
import { leaderboardQueryOptions } from '@/features/leaderboard/leaderboard.queries';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/leaderboard')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(leaderboardQueryOptions),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: LeaderboardComponent,
});

function LeaderboardComponent() {
  // initialData from loader means no loading flash; refetchInterval keeps it live
  const loaderData = Route.useLoaderData();
  const { data: rankings } = useQuery({
    ...leaderboardQueryOptions,
    initialData: loaderData,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
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
