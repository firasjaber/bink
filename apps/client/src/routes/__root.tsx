import {
	createRootRoute,
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import "../App.css";
import { type AuthState, useAuthStore } from "@/stores/auth";

import { useEffect } from "react";

interface RouterContext {
	auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => {
		const { initAuth, isLoading } = useAuthStore();

		useEffect(() => {
			initAuth();
		}, [initAuth]);

		if (isLoading) {
			return <div>Loading...</div>;
		}

		return (
			<>
				<Outlet />
				<TanStackRouterDevtools />
			</>
		);
	},
});
