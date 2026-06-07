import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { competitionsQueryOptions } from '@/features/competitions/competitions.queries';
import { RouteError } from '@/components/route-error';
import type { Competition } from '@/features/competitions/competitions.repository';

export const Route = createFileRoute('/competitions/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(competitionsQueryOptions),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: CompetitionsPage,
});

const STATUS_LABEL: Record<Competition['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
};

const STATUS_COLOUR: Record<Competition['status'], string> = {
  upcoming: 'bg-blue-50 text-blue-700',
  active: 'bg-green-50 text-green-700',
  completed: 'bg-muted text-muted-foreground',
};

function CompetitionsPage() {
  const loaderData = Route.useLoaderData();
  const { data: competitions } = useQuery({ ...competitionsQueryOptions, initialData: loaderData });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">All Competitions</h1>

      {competitions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No competitions yet.</p>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <Link
              key={c.id}
              to="/competitions/$competitionId"
              params={{ competitionId: c.id }}
              className="border rounded-xl p-5 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {c.sport} ·{' '}
                  {new Date(c.startDate).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                  {' – '}
                  {new Date(c.endDate).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOUR[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
