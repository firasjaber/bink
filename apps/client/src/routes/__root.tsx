import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import '../App.css';
import { Navbar } from '@/components/Navbar';
import { FullScreenLoading } from '@/components/ui/full-screen-loading';
import { type AuthState, useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';

export interface RouterContext {
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
