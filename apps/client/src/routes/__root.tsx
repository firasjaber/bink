import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import "../App.css";
import { type AuthState, useAuthStore } from "@/stores/auth";
import { Navbar } from "@/components/Navbar";
import { useEffect } from "react";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";

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
