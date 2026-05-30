import { createFileRoute, Link } from '@tanstack/react-router';
import { matchesQueryOptions } from '@/features/matches/matches.queries';
import type { Match } from '@/features/matches/matches.repository';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/matches/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(matchesQueryOptions),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: MatchesComponent,
});

function MatchesComponent() {
  const matches = Route.useLoaderData();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">World Cup 2026 Fixtures</h1>
      <div className="grid gap-3">
        {matches.map((match: Match) => (
          <Link
            key={match.id}
            to="/matches/$matchId"
            params={{ matchId: match.id }}
            className="border p-4 rounded-xl flex justify-between items-center hover:bg-accent transition-colors"
          >
            <span className="font-semibold">{match.homeTeam}</span>
            <div className="text-center">
              <span className="text-sm text-muted-foreground">vs</span>
              {match.group && <p className="text-xs text-muted-foreground">Group {match.group}</p>}
            </div>
            <span className="font-semibold">{match.awayTeam}</span>
          </Link>
        ))}
        {matches.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No fixtures loaded yet.</p>
        )}
      </div>
    </div>
  );
}
