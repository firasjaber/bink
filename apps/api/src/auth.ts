import { lucia } from '.';

export const validateSession = async (cookie: string) => {
  const sessionId = lucia.readSessionCookie(cookie);
  if (!sessionId) {
    return false;
  }

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) {
    if (session) {
      await lucia.invalidateSession(sessionId);
    }
    return false;
  }

  return true;
};

export const getUserIdFromSession = async (cookie: string) => {
  const sessionId = lucia.readSessionCookie(cookie);
  if (!sessionId) {
    return null;
  }

  const { user } = await lucia.validateSession(sessionId);

  if (!user) {
    throw new Error('User not found');
  }
  return user.id;
};
