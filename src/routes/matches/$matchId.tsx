import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchQueryOptions } from '@/features/matches/matches.queries';
import { insightQueryOptions } from '@/features/insights/insights.queries';
import { userTipQueryOptions } from '@/features/tips/tips.queries';
import { getOrGenerateInsightFn } from '@/features/insights/insights.server';
import { TipForm } from '@/components/tip-form';
import { RouteError } from '@/components/route-error';

export const Route = createFileRoute('/matches/$matchId')({
  loader: async ({ context: { queryClient }, params }) => {
    const [match] = await Promise.all([
      queryClient.ensureQueryData(matchQueryOptions(params.matchId)),
      queryClient.ensureQueryData(insightQueryOptions(params.matchId)),
      queryClient.ensureQueryData(userTipQueryOptions(params.matchId)),
    ]);
    if (!match) throw new Error('Match not found');
  },
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: MatchDetail,
});

function MatchDetail() {
  const { matchId } = Route.useParams();
  const queryClient = useQueryClient();

  const match = queryClient.getQueryData(matchQueryOptions(matchId).queryKey)!;
  const cachedInsight = queryClient.getQueryData(insightQueryOptions(matchId).queryKey);

  // Reactive: refetches automatically after tip submission
  const { data: tipData } = useQuery(userTipQueryOptions(matchId));

  const {
    mutate: consultCoPilot,
    isPending: insightPending,
    data: generatedInsight,
    error: insightError,
  } = useMutation({
    mutationFn: () => getOrGenerateInsightFn({ data: matchId }),
    onSuccess: (data) => {
      queryClient.setQueryData(insightQueryOptions(matchId).queryKey, data);
    },
  });

  const insight = generatedInsight ?? cachedInsight;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Match header */}
      <div className="border rounded-xl p-6">
        <div className="flex justify-between items-center text-2xl font-bold mb-2">
          <span>{match.homeTeam}</span>
          <div className="text-center">
            {match.status === 'completed' && match.homeScore !== null ? (
              <span className="text-3xl">
                {match.homeScore} – {match.awayScore}
              </span>
            ) : (
              <span className="text-muted-foreground text-base">vs</span>
            )}
          </div>
          <span>{match.awayTeam}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {match.group && (
            <span className="text-sm text-muted-foreground">Group {match.group} ·</span>
          )}
          <span className="text-sm text-muted-foreground">{match.venue}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">
            {new Date(match.matchDate).toLocaleString()}
          </span>
          {match.status === 'live' && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          )}
          {match.status === 'completed' && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              FT
            </span>
          )}
        </div>
      </div>

      {/* Tip submission */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Your Tip</h2>
        <TipForm
          matchId={matchId}
          matchStatus={match.status}
          isAuthenticated={tipData?.isAuthenticated ?? false}
          existingTip={tipData?.tip ?? null}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
      </div>

      {/* AI Co-Pilot */}
      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">AI Co-Pilot</h2>
        {insightError && (
          <p className="text-sm text-destructive">Failed to generate analysis. Please try again.</p>
        )}
        {insight ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-accent rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Home Win</p>
                <p className="font-bold">{insight.winProbabilityHome}%</p>
              </div>
              <div className="bg-accent rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Draw</p>
                <p className="font-bold">{insight.winProbabilityDraw}%</p>
              </div>
              <div className="bg-accent rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Away Win</p>
                <p className="font-bold">{insight.winProbabilityAway}%</p>
              </div>
            </div>
            <p className="text-sm font-medium">Predicted: {insight.predictedWinner}</p>
            <p className="text-sm text-muted-foreground">{insight.tacticalAnalysis}</p>
          </div>
        ) : (
          <button
            onClick={() => consultCoPilot()}
            disabled={insightPending}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {insightPending ? 'Analysing…' : 'Consult Co-Pilot'}
          </button>
        )}
      </div>
    </div>
  );
}
