import { router } from '../App';
import { useAuthStore } from '../stores/auth';

export const redirectToAuth = () => {
  useAuthStore.setState({ ...useAuthStore.getState(), isAuth: false, user: null });
  router.navigate({ to: '/auth' });
};
