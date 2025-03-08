import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AuthState, useAuthStore } from './stores/auth';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new query client
const queryClient = new QueryClient();

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: {
      user: null,
      isLoading: true,
      isAuth: false,
    } as AuthState,
  },
  defaultPreload: 'intent',
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const auth = useAuthStore();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>
  );
}
