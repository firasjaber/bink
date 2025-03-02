import { createFileRoute, redirect } from '@tanstack/react-router';
import { googleAuthCallback } from '@/eden';

export const Route = createFileRoute('/auth/callback')({
  loader: async () => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      throw redirect({ to: '/auth' });
    }

    try {
      const response = await googleAuthCallback(code);
      if (response.error) {
        throw new Error(response.error.value as string);
      }

      throw redirect({ to: '/' });
    } catch (error) {
      console.error('Google callback error:', error);
      throw redirect({ to: '/auth' });
    }
  },
  component: GoogleCallback,
});

function GoogleCallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-xl font-semibold">Redirecting...</div>
    </div>
  );
}
