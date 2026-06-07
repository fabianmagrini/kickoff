import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { myLeaguesQueryOptions } from '@/features/leagues/leagues.queries';
import { competitionQueryOptions } from '@/features/competitions/competitions.queries';
import { createLeagueFn } from '@/features/leagues/leagues.server';
import { RouteError } from '@/components/route-error';
import type { League } from '@/features/leagues/leagues.repository';

export const Route = createFileRoute('/competitions/$competitionId/leagues/')({
  loader: async ({ context: { queryClient }, params }) => {
    const { competitionId } = params;
    try {
      const [competition, leagues] = await Promise.all([
        queryClient.ensureQueryData(competitionQueryOptions(competitionId)),
        queryClient.ensureQueryData(myLeaguesQueryOptions(competitionId)),
      ]);
      return { competition, leagues };
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        throw redirect({ to: '/login' });
      }
      throw err;
    }
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: LeaguesPage,
});

function LeaguesPage() {
  const { competition, leagues: leaguesData } = Route.useLoaderData();
  const { params } = Route.useMatch();
  const { competitionId } = params;
  const { data: myLeagues } = useQuery({
    ...myLeaguesQueryOptions(competitionId),
    initialData: leaguesData,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const { mutate: createLeague, isPending, error } = useMutation({
    mutationFn: () => createLeagueFn({ data: { name, competitionId } }),
    onSuccess: (league) => {
      queryClient.invalidateQueries({ queryKey: ['leagues', 'mine', competitionId] });
      navigate({
        to: '/competitions/$competitionId/leagues/$leagueId',
        params: { competitionId, leagueId: league.id },
      });
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/competitions/$competitionId"
            params={{ competitionId }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {competition.name}
          </Link>
          <h1 className="text-3xl font-bold mt-1">Leagues</h1>
        </div>
        <Link
          to="/competitions/$competitionId/leagues/join"
          params={{ competitionId }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Join with a code →
        </Link>
      </div>

      <div className="border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Create a new league</h2>
        {creating ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="League name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) createLeague();
                if (e.key === 'Escape') setCreating(false);
              }}
              className="flex-1 border rounded px-3 py-2 text-sm"
              maxLength={50}
            />
            <button
              onClick={() => { if (name.trim()) createLeague(); }}
              disabled={isPending || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + New league
          </button>
        )}
        {error && <p className="text-xs text-destructive">{(error as Error).message}</p>}
      </div>

      <div className="space-y-2">
        {myLeagues.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            You're not in any leagues yet. Create one or{' '}
            <Link
              to="/competitions/$competitionId/leagues/join"
              params={{ competitionId }}
              className="underline underline-offset-2"
            >
              join with an invite code
            </Link>
            .
          </p>
        ) : (
          myLeagues.map((league) => (
            <LeagueRow key={league.id} league={league} competitionId={competitionId} />
          ))
        )}
      </div>
    </div>
  );
}

function LeagueRow({ league, competitionId }: { league: League; competitionId: string }) {
  return (
    <Link
      to="/competitions/$competitionId/leagues/$leagueId"
      params={{ competitionId, leagueId: league.id }}
      className="border rounded-xl p-4 flex items-center justify-between hover:bg-accent transition-colors"
    >
      <span className="font-medium">{league.name}</span>
      <span className="text-xs text-muted-foreground font-mono">{league.inviteCode}</span>
    </Link>
  );
}
