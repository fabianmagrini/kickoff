import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { submitTipFn } from '@/features/tips/tips.server';
import { userTipQueryOptions } from '@/features/tips/tips.queries';
import type { Tip } from '@/features/tips/tips.repository';

type Props = {
  matchId: string;
  matchStatus: 'scheduled' | 'live' | 'completed';
  isAuthenticated: boolean;
  existingTip: Tip | null;
  homeTeam: string;
  awayTeam: string;
};

export function TipForm({
  matchId,
  matchStatus,
  isAuthenticated,
  existingTip,
  homeTeam,
  awayTeam,
}: Props) {
  const queryClient = useQueryClient();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const { mutate: submitTip, isPending, error } = useMutation({
    mutationFn: () =>
      submitTipFn({
        data: {
          matchId,
          predictedHomeScore: parseInt(homeScore, 10),
          predictedAwayScore: parseInt(awayScore, 10),
        },
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: userTipQueryOptions(matchId).queryKey });
      const previous = queryClient.getQueryData(userTipQueryOptions(matchId).queryKey);
      queryClient.setQueryData(userTipQueryOptions(matchId).queryKey, {
        isAuthenticated: true,
        tip: {
          id: '',
          userId: '',
          matchId,
          predictedHomeScore: parseInt(homeScore, 10),
          predictedAwayScore: parseInt(awayScore, 10),
          pointsEarned: 0,
          scoredAt: null,
          createdAt: new Date(),
        },
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(userTipQueryOptions(matchId).queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userTipQueryOptions(matchId).queryKey });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-muted-foreground mb-2">Sign in to submit a tip</p>
        <Link to="/login" className="text-sm font-medium underline underline-offset-2">
          Sign in
        </Link>
      </div>
    );
  }

  if (existingTip) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Your tip: {existingTip.predictedHomeScore} – {existingTip.predictedAwayScore}
        </p>
        {matchStatus === 'completed' && existingTip.scoredAt && (
          <p className="text-sm text-muted-foreground">
            Points earned:{' '}
            <span className="font-bold text-foreground">{existingTip.pointsEarned}</span>
          </p>
        )}
        {matchStatus === 'completed' && !existingTip.scoredAt && (
          <p className="text-sm text-muted-foreground">Awaiting score calculation…</p>
        )}
        {matchStatus !== 'completed' && (
          <p className="text-xs text-muted-foreground">Tips are locked once submitted.</p>
        )}
      </div>
    );
  }

  if (matchStatus === 'completed') {
    return (
      <p className="text-sm text-muted-foreground">You didn't tip on this match.</p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitTip();
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{homeTeam}</p>
          <input
            type="number"
            min="0"
            max="20"
            required
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-full border rounded-lg px-3 py-2 text-center text-xl font-bold bg-background"
          />
        </div>
        <span className="text-muted-foreground pb-2">–</span>
        <div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{awayTeam}</p>
          <input
            type="number"
            min="0"
            max="20"
            required
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-full border rounded-lg px-3 py-2 text-center text-xl font-bold bg-background"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to submit tip'}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending || !homeScore || !awayScore}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
      >
        {isPending ? 'Submitting…' : 'Lock in Tip'}
      </button>
    </form>
  );
}
