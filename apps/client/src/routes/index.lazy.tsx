import { useAuthStore } from "@/stores/auth";
import { createLazyFileRoute, Link } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
	component: Index,
});

function Index() {
	const { user } = useAuthStore((state) => state);
	console.log(user);
	return (
		<>
			<div className="card">home</div>
			{user ? (
				<Link to="/profile/$id" params={{ id: user.id }} className="underline">
					profile
				</Link>
			) : (
				<Link className="underline" to="/auth">
					Sign in
				</Link>
			)}
		</>
	);
}
