import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullScreenLoading } from '@/components/ui/full-screen-loading';
import { deleteAccount, getLinks } from '@/eden';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Link, Moon, Sun } from 'lucide-react';

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
  const { user, logout } = useAuthStore((state) => state);
  const { theme, toggleTheme } = useThemeStore((state) => state);
  const navigate = Route.useNavigate();

  const { data: linksData } = useQuery({
    queryKey: ['links', 'count'],
    queryFn: () => getLinks(null),
    enabled: !!user,
  });

  const { mutate: deleteAccountMutate, isPending } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      navigate({ to: '/auth' });
    },
  });

  const { mutate: logoutMutate, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      navigate({ to: '/' });
    },
  });

  if (!user) {
    return <FullScreenLoading />;
  }

  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? (
                  <Sun className="h-[1.2rem] w-[1.2rem]" />
                ) : (
                  <Moon className="h-[1.2rem] w-[1.2rem]" />
                )}
              </Button>
              <Button variant="outline" onClick={() => logoutMutate()} disabled={isLoggingOut}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profilePicture || undefined} alt={user.firstName} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Links</p>
                <p className="text-2xl font-bold">
                  {linksData?.total && Array.isArray(linksData.total) && linksData.total[0]
                    ? linksData.total[0].count
                    : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and
                    remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutate()}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
