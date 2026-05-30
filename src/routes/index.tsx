import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Kickoff</h1>
      <p className="text-muted-foreground mb-8">FIFA World Cup 2026 Tipping Competition</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/matches" className="border rounded-xl p-4 hover:bg-accent transition-colors">
          <h2 className="font-semibold text-lg">Fixtures</h2>
          <p className="text-sm text-muted-foreground">Browse all 104 matches</p>
        </a>
        <a href="/leaderboard" className="border rounded-xl p-4 hover:bg-accent transition-colors">
          <h2 className="font-semibold text-lg">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">See who's winning the comp</p>
        </a>
      </div>
    </div>
  );
}
