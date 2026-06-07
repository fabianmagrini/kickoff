import { db } from '@/db';
import { competitions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export type Competition = typeof competitions.$inferSelect;

export const competitionsRepository = {
  getAll: async (): Promise<Competition[]> =>
    db.select().from(competitions).orderBy(desc(competitions.startDate)),

  getById: async (id: string): Promise<Competition | null> => {
    const [row] = await db.select().from(competitions).where(eq(competitions.id, id));
    return row ?? null;
  },

  getBySlug: async (slug: string): Promise<Competition | null> => {
    const [row] = await db.select().from(competitions).where(eq(competitions.slug, slug));
    return row ?? null;
  },

  getActive: async (): Promise<Competition[]> =>
    db
      .select()
      .from(competitions)
      .where(eq(competitions.status, 'active'))
      .orderBy(desc(competitions.startDate)),
};
