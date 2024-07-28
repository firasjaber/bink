import { Button } from "@/components/ui/button";
import { createProtectedFileRoute } from "@/lib/router";
import { useAuthStore } from "@/stores/auth";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profile/$id")({
	component: Profile,
	beforeLoad: ({ context }) => {
		if (context.auth.isLoading) {
			return <div>Loading...</div>;
		}
		if (!context.auth.isLoading && !context.auth.isAuth) {
			throw redirect({
				to: "/auth",
			});
		}
	},
});

function Profile() {
	const id = Route.useParams().id;
	const { user, isAuth, logout } = useAuthStore((state) => state);
	const navigate = Route.useNavigate();
	const { mutate } = useMutation({
		mutationFn: logout,
		onSuccess: () => {
			navigate("/");
		},
	});

	if (!user) {
		return <div>loading...</div>;
	}

	return (
		<div className="flex items-center flex-col space-y-4">
			<div>User profile with id :{id}</div>
			{JSON.stringify(user)}
			<Button onClick={() => mutate()}>logout</Button>
		</div>
	);
}
