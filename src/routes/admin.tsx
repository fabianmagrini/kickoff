import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { checkIsAdminFn, updateMatchFn } from '@/features/admin/admin.server';
import { matchesQueryOptions } from '@/features/matches/matches.queries';
import { RouteError } from '@/components/route-error';
import type { Match } from '@/features/matches/matches.repository';

export const Route = createFileRoute('/admin')({
  loader: async ({ context: { queryClient } }) => {
    await checkIsAdminFn();
    return queryClient.ensureQueryData(matchesQueryOptions);
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: AdminPage,
});

type EditState = {
  homeScore: string;
  awayScore: string;
  status: 'scheduled' | 'live' | 'completed';
};

function MatchRow({ match }: { match: Match }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>({
    homeScore: match.homeScore?.toString() ?? '',
    awayScore: match.awayScore?.toString() ?? '',
    status: match.status,
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      updateMatchFn({
        data: {
          matchId: match.id,
          homeScore: form.homeScore !== '' ? Number(form.homeScore) : null,
          awayScore: form.awayScore !== '' ? Number(form.awayScore) : null,
          status: form.status,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setEditing(false);
    },
  });

  const dateStr = new Date(match.matchDate).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 text-sm text-muted-foreground w-24">{dateStr}</td>
      <td className="py-3 pr-4 text-sm font-medium">
        {match.homeTeam} vs {match.awayTeam}
        {match.group && (
          <span className="ml-2 text-xs text-muted-foreground">Grp {match.group}</span>
        )}
      </td>

      {editing ? (
        <>
          <td className="py-3 pr-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={99}
                value={form.homeScore}
                onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
                className="w-14 border rounded px-2 py-1 text-sm text-center"
                placeholder="–"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="number"
                min={0}
                max={99}
                value={form.awayScore}
                onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
                className="w-14 border rounded px-2 py-1 text-sm text-center"
                placeholder="–"
              />
            </div>
          </td>
          <td className="py-3 pr-2">
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as EditState['status'] }))
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </td>
          <td className="py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => mutate()}
                disabled={isPending}
                className="text-sm font-medium px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              {error && (
                <span className="text-xs text-destructive">{(error as Error).message}</span>
              )}
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="py-3 pr-4 text-sm tabular-nums w-20">
            {match.homeScore !== null && match.awayScore !== null
              ? `${match.homeScore} – ${match.awayScore}`
              : '–'}
          </td>
          <td className="py-3 pr-4">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                match.status === 'completed'
                  ? 'bg-muted text-muted-foreground'
                  : match.status === 'live'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {match.status}
            </span>
          </td>
          <td className="py-3">
            <button
              onClick={() => {
                setForm({
                  homeScore: match.homeScore?.toString() ?? '',
                  awayScore: match.awayScore?.toString() ?? '',
                  status: match.status,
                });
                setEditing(true);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function AdminPage() {
  const matches = Route.useLoaderData();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin — Match Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set scores and status. Saving a completed match triggers automatic re-scoring.
        </p>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Match</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Score</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="py-2 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y px-4">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </tbody>
        </table>
        {matches.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No matches seeded — run <code>npm run db:seed:dev</code>
          </p>
        )}
      </div>
    </div>
  );
}
