import { lucia } from './lucia';

export const validateSession = async (bearer: string) => {
  const sessionId = lucia.readBearerToken(bearer);
  if (!sessionId) {
    return false;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  try {
    if (!user || !session) {
      await lucia.invalidateSession(sessionId).catch(() => false);
      return false;
    }
    return true;
  } catch {
    await lucia.invalidateSession(sessionId).catch(() => false);
    return false;
  }
};

export const getUserIdFromSession = async (bearer: string) => {
  const sessionId = lucia.readBearerToken(bearer);
  if (!sessionId) {
    return null;
  }

  const { user } = await lucia.validateSession(sessionId);

  if (!user) {
    throw new Error('User not found');
  }
  return user.id;
};
