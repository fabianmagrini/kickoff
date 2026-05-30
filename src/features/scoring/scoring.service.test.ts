import { describe, it, expect, vi, beforeEach } from 'vitest';

// Drizzle uses a builder pattern: db.select().from().where() — each returns the builder,
// and the chain itself is awaitable (thenable). We model this with a factory.
function makeBuilder(resolveWith: unknown) {
  const builder: Record<string, unknown> = {};
  const methods = ['from', 'where', 'set'];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  // Make the builder itself a thenable so `await db.select().from().where()` works
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(resolveWith).then(resolve);
  return builder;
}

const selectBuilder = makeBuilder([]);
const updateBuilder = makeBuilder(undefined);

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => selectBuilder),
    update: vi.fn(() => updateBuilder),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  isNull: vi.fn(() => 'isNull'),
  isNotNull: vi.fn(() => 'isNotNull'),
  and: vi.fn(() => 'and'),
  sum: vi.fn(() => 'sum'),
}));

import { scoreCompletedMatches } from './scoring.service';

describe('scoreCompletedMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero counts when no completed matches exist', async () => {
    // Override select builder to resolve with empty array
    (selectBuilder as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
      Promise.resolve([]).then(resolve);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });

  it('skips completed matches with null scores (data entry lag)', async () => {
    (selectBuilder as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
      Promise.resolve([
        { id: 'm1', status: 'completed', homeScore: null, awayScore: null },
      ]).then(resolve);

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });

  it('skips matches where all tips are already scored', async () => {
    let callCount = 0;
    (selectBuilder as Record<string, unknown>).then = (resolve: (v: unknown) => void) => {
      callCount++;
      // First await = completed matches query; second = unscored tips query
      const data = callCount === 1
        ? [{ id: 'm1', status: 'completed', homeScore: 2, awayScore: 1 }]
        : []; // no unscored tips
      return Promise.resolve(data).then(resolve);
    };

    const result = await scoreCompletedMatches();

    expect(result).toEqual({ tipsScored: 0, matchesProcessed: 0 });
  });
});
