import { useRouter } from '@tanstack/react-router';

type Props = {
  error: Error;
  reset: () => void;
};

export function RouteError({ error, reset }: Props) {
  const router = useRouter();

  function handleReset() {
    router.invalidate();
    reset();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="border border-destructive/30 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-lg text-destructive">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={handleReset}
          className="text-sm font-medium underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
