import { Button } from '@/components/ui/button';
import { FullScreenLoading } from '@/components/ui/full-screen-loading';
import { useAuthStore } from '@/stores/auth';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/profile/$id')({
  component: Profile,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return <FullScreenLoading />;
    }
    if (!context.auth.isLoading && !context.auth.isAuth) {
      throw redirect({
        to: '/auth',
      });
    }
  },
});

function Profile() {
  const id = Route.useParams().id;
  const { user, logout } = useAuthStore((state) => state);
  const navigate = Route.useNavigate();
  const { mutate } = useMutation({
    // @ts-ignore
    mutationFn: logout,
    onSuccess: () => {
      navigate({ to: '/' });
    },
  });

  if (!user) {
    return <FullScreenLoading />;
  }

  return (
    <div className="flex items-center flex-col space-y-4">
      <div>User profile with id :{id}</div>
      {JSON.stringify(user)}
      <Button onClick={() => mutate()}>logout</Button>
    </div>
  );
}
