import { createRootRouteWithContext, HeadContent, Link, Outlet, Scripts, useRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { authClient } from '@/auth/authClient';
import appCss from '@/styles/app.css?url';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kickoff — World Cup 2026 Tipping' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
  component: RootComponent,
});

function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="min-h-screen bg-background font-sans antialiased flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="text-sm font-medium underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            Try again
          </button>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function RootNotFound() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="min-h-screen bg-background font-sans antialiased flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <Link
            to="/"
            className="text-sm font-medium underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            Go home
          </Link>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function Navbar() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <nav className="border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-lg tracking-tight">
          Kickoff
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/competitions"
            className="text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: 'text-foreground font-medium' }}
          >
            Competitions
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {isPending ? null : session?.user ? (
          <>
            <Link
              to="/profile"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              {session.user.name}
            </Link>
            <button
              onClick={async () => { await authClient.signOut(); window.location.href = '/'; }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="font-medium hover:text-muted-foreground transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        {children}
        <Scripts />
      </body>
    </html>
  );
}
