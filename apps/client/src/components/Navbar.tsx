import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import { Link } from '@tanstack/react-router';

export function Navbar() {
  return (
    <header className="flex justify-between p-4 border-b container">
      <Link to="/" className="flex items-center space-x-2">
        <img src="/logo.png" alt="Bink Logo" className="h-8 w-auto" />
        <span className="text-xl font-bold">Bink</span>
      </Link>
      <UserAvatar />
    </header>
  );
}

function UserAvatar() {
  const { user } = useAuthStore((state) => state);
  if (user) {
    return (
      <Link to="/profile/$id" params={{ id: user.id }}>
        <Avatar>
          <AvatarImage
            src={
              user.profilePicture ??
              'https://i.pinimg.com/736x/9d/4a/49/9d4a49b2b2b9392d3f844c4dbcff52d6.jpg'
            }
            alt={user.firstName}
          />
          <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
    );
  }
  <Link className="underline" to="/auth">
    Sign in
  </Link>;
}
