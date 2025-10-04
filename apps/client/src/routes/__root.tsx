import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import '../App.css';
import { Navbar } from '@/components/Navbar';
import { FullScreenLoading } from '@/components/ui/full-screen-loading';
import { type AuthState, useAuthStore } from '@/stores/auth';
import { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export interface RouterContext {
  queryClient: QueryClient;
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => {
    const { initAuth, isLoading } = useAuthStore();

    useEffect(() => {
      initAuth();
    }, [initAuth]);

    if (isLoading) {
      return <FullScreenLoading />;
    }

    return (
      <>
        <Navbar />
        <Outlet />
        <TanStackRouterDevtools />
      </>
    );
  },
});
