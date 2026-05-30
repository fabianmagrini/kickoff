import { auth } from '@/auth/auth';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/auth/$')({
  // @ts-expect-error - Better Auth handler type
  handler: async ({ request }: { request: Request }) => auth.handler(request),
});
