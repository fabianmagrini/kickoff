import { auth } from '@/auth/auth';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/auth/$')({
  // @ts-expect-error - server.handlers not in TanStack Router types
  server: {
    handlers: {
      ANY: ({ request }: { request: Request }) => auth.handler(request),
    },
  },
});
