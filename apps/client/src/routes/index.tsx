import { useAuthStore } from '@/stores/auth';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { user } = useAuthStore((state) => state);
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
