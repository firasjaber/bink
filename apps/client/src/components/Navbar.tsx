import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth';
import { Link } from '@tanstack/react-router';

export function Navbar() {
  return (
    <header className="flex justify-between px-6 py-4 lg:px-20 border-b container">
      <Link to="/" className="flex items-center space-x-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-[20px]">bookmark_manager</span>
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">Bink</p>
        </div>
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
