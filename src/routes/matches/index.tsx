import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { matchesQueryOptions } from '@/features/matches/matches.queries';
import type { Match } from '@/features/matches/matches.repository';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/matches/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(matchesQueryOptions),
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

const STAGE_ORDER: Record<string, number> = {
  group_A: 1, group_B: 2, group_C: 3, group_D: 4,
  group_E: 5, group_F: 6, group_G: 7, group_H: 8,
  group_I: 9, group_J: 10, group_K: 11, group_L: 12,
  'Round of 32': 20,
  'Round of 16': 21,
  'Quarter-Final': 22,
  'Semi-Final': 23,
  'Third Place': 24,
  'Final': 25,
  __knockout__: 99,
};

// ─── Filter type ──────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Scheduled', 'Live', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

function applyFilter(matches: Match[], filter: Filter): Match[] {
  if (filter === 'All') return matches;
  return matches.filter((m) => m.status === filter.toLowerCase());
}

function groupByStage(matches: Match[]): [string, string, Match[]][] {
  const map = new Map<string, [string, Match[]]>();
  for (const match of matches) {
    const key = stageKey(match.group);
    if (!map.has(key)) map.set(key, [stageLabel(match.group), []]);
    map.get(key)![1].push(match);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (STAGE_ORDER[a] ?? 98) - (STAGE_ORDER[b] ?? 98))
    .map(([key, [label, matches]]) => [key, label, matches]);
}

// ─── Component ────────────────────────────────────────────────────────────────

function MatchesComponent() {
  const loaderData = Route.useLoaderData();
  const { data: allMatches } = useQuery({ ...matchesQueryOptions, initialData: loaderData });
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = applyFilter(allMatches, filter);
  const groups = groupByStage(filtered);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">World Cup 2026 Fixtures</h1>

      {/* Status filter */}
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
        <p className="text-muted-foreground text-center py-8">No {filter.toLowerCase()} matches.</p>
      )}

      {/* Grouped fixture list */}
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
          <span className="font-bold tabular-nums">
            {match.homeScore} – {match.awayScore}
          </span>
        ) : match.status === 'live' ? (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            LIVE
          </span>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">vs</p>
            <p className="text-xs text-muted-foreground">
              {new Date(match.matchDate).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        )}
      </div>

      <span className="flex-1 font-semibold text-sm">{match.awayTeam}</span>
    </Link>
  );
}
