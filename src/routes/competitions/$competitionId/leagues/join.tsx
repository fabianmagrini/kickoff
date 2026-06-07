import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { myLeaguesQueryOptions } from '@/features/leagues/leagues.queries';
import { competitionQueryOptions } from '@/features/competitions/competitions.queries';
import { joinLeagueFn } from '@/features/leagues/leagues.server';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/competitions/$competitionId/leagues/join')({
  loader: async ({ context: { queryClient }, params }) => {
    const { competitionId } = params;
    try {
      const [competition] = await Promise.all([
        queryClient.ensureQueryData(competitionQueryOptions(competitionId)),
        queryClient.ensureQueryData(myLeaguesQueryOptions(competitionId)),
      ]);
      return competition;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        throw redirect({ to: '/login' });
      }
      throw err;
    }
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: JoinPage,
});

function JoinPage() {
  const competition = Route.useLoaderData();
  const { params } = Route.useMatch();
  const { competitionId } = params;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const { mutate: join, isPending, error } = useMutation({
    mutationFn: () => joinLeagueFn({ data: { inviteCode: code } }),
    onSuccess: (league) => {
      queryClient.invalidateQueries({ queryKey: ['leagues', 'mine', competitionId] });
      navigate({
        to: '/competitions/$competitionId/leagues/$leagueId',
        params: { competitionId, leagueId: league.id },
      });
    },
  });

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <div>
        <Link
          to="/competitions/$competitionId/leagues"
          params={{ competitionId }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Leagues
        </Link>
        <h1 className="text-3xl font-bold mt-1">Join a League</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the invite code shared by the league owner.
        </p>
      </div>

      <div className="border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <label htmlFor="invite-code" className="text-sm font-medium">Invite code</label>
          <input
            id="invite-code"
            type="text"
            placeholder="e.g. ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) join(); }}
            className="w-full border rounded px-3 py-2 text-sm font-mono uppercase tracking-widest"
            maxLength={10}
          />
        </div>
        {error && <p className="text-xs text-destructive">{(error as Error).message}</p>}
        <button
          onClick={() => { if (code.trim()) join(); }}
          disabled={isPending || !code.trim()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Joining…' : 'Join league'}
        </button>
      </div>
    </div>
  );
}
