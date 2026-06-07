import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { matchesQueryOptions } from '@/features/matches/matches.queries';
import { competitionQueryOptions } from '@/features/competitions/competitions.queries';
import type { Match } from '@/features/matches/matches.repository';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/competitions/$competitionId/matches/')({
  loader: async ({ context: { queryClient }, params }) => {
    const { competitionId } = params;
    const [competition, matches] = await Promise.all([
      queryClient.ensureQueryData(competitionQueryOptions(competitionId)),
      queryClient.ensureQueryData(matchesQueryOptions(competitionId)),
    ]);
    return { competition, matches };
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: MatchesComponent,
});

// ─── Grouping helpers ─────────────────────────────────────────────────────────

function stageKey(group: string | null): string {
  if (!group) return '__knockout__';
  if (group.length === 1) return `group_${group}`;
  return group;
}

function stageLabel(group: string | null): string {
  if (!group) return 'Knockout Stage';
  if (group.length === 1) return `Group ${group}`;
  return group;
}

// Group-stage letters sort before named knockout rounds
const NAMED_STAGE_ORDER: Record<string, number> = {
  'Round of 32': 20, 'Round of 16': 21,
  'Quarter-Final': 22, 'Semi-Final': 23,
  'Third Place': 24, 'Final': 25,
  __knockout__: 99,
};

function stageOrder(key: string): number {
  if (key.startsWith('group_')) return key.charCodeAt(6); // 'A'=65, 'B'=66, …
  return NAMED_STAGE_ORDER[key] ?? 98;
}

function groupByStage(matches: Match[]): [string, string, Match[]][] {
  const map = new Map<string, [string, Match[]]>();
  for (const match of matches) {
    const key = stageKey(match.group);
    if (!map.has(key)) map.set(key, [stageLabel(match.group), []]);
    map.get(key)![1].push(match);
  }
  return [...map.entries()]
    .sort(([a], [b]) => stageOrder(a) - stageOrder(b))
    .map(([key, [label, matches]]) => [key, label, matches]);
}

// ─── Filter ───────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Scheduled', 'Live', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

function applyFilter(matches: Match[], filter: Filter): Match[] {
  if (filter === 'All') return matches;
  return matches.filter((m) => m.status === filter.toLowerCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

function MatchesComponent() {
  const { competition, matches: matchesData } = Route.useLoaderData();
  const { params } = Route.useMatch();
  const { data: allMatches } = useQuery({
    ...matchesQueryOptions(params.competitionId),
    initialData: matchesData,
  });
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = applyFilter(allMatches, filter);
  const groups = groupByStage(filtered);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to="/competitions/$competitionId"
          params={{ competitionId: params.competitionId }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {competition.name}
        </Link>
        <h1 className="text-3xl font-bold mt-1">{competition.name} Fixtures</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {allMatches.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No fixtures loaded yet.</p>
      )}
      {allMatches.length > 0 && filtered.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No {filter.toLowerCase()} matches.
        </p>
      )}

      <div className="space-y-6">
        {groups.map(([key, label, matches]) => (
          <section key={key}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {label}
            </h2>
            <div className="grid gap-2">
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="border rounded-xl p-4 flex items-center gap-4 hover:bg-accent transition-colors"
    >
      <span className="flex-1 font-semibold text-right text-sm">{match.homeTeam}</span>
      <div className="text-center shrink-0 w-24">
        {match.status === 'completed' && match.homeScore !== null && match.awayScore !== null ? (
          <span className="font-bold tabular-nums">{match.homeScore} – {match.awayScore}</span>
        ) : match.status === 'live' ? (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">LIVE</span>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">vs</p>
            <p className="text-xs text-muted-foreground">
              {new Date(match.matchDate).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}
      </div>
      <span className="flex-1 font-semibold text-sm">{match.awayTeam}</span>
    </Link>
  );
}
