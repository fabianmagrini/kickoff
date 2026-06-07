import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { activeCompetitionsQueryOptions } from '@/features/competitions/competitions.queries';
import { RouteError } from '@/components/route-error';
import type { Competition } from '@/features/competitions/competitions.repository';

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    const active = await queryClient.ensureQueryData(activeCompetitionsQueryOptions);
    // Single active competition — go straight to its dashboard
    if (active.length === 1) {
      throw redirect({ to: '/competitions/$competitionId', params: { competitionId: active[0].id } });
    }
    return active;
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: CompetitionsHome,
});

function CompetitionsHome() {
  const loaderData = Route.useLoaderData();
  const { data: competitions } = useQuery({ ...activeCompetitionsQueryOptions, initialData: loaderData });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kickoff</h1>
        <p className="text-muted-foreground mt-1">Choose a competition to start tipping.</p>
      </div>

      {competitions.length === 0 ? (
        <div className="border rounded-xl p-8 text-center space-y-2">
          <p className="font-medium">No active competitions</p>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <CompetitionCard key={c.id} competition={c} />
          ))}
        </div>
      )}

      <p className="text-sm text-center">
        <Link to="/competitions" className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
          Browse all competitions →
        </Link>
      </p>
    </div>
  );
}

function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link
      to="/competitions/$competitionId"
      params={{ competitionId: competition.id }}
      className="border rounded-xl p-5 flex items-center justify-between hover:bg-accent transition-colors"
    >
      <div>
        <p className="font-semibold">{competition.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{competition.sport}</p>
      </div>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
        Active
      </span>
    </Link>
  );
}
