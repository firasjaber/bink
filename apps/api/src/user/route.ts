import argon from 'argon2';
import * as queries from 'db/src/queries';
import Elysia, { error, t } from 'elysia';
import OpenAI from 'openai';
import { getRemainingTrials } from '../ai/access';
import { getUserIdFromSession, validateSession } from '../auth';
import { drizzle, lucia } from '../index';

const maskOpenAiKey = (apiKey: string | null) => {
  if (!apiKey) return null;
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
};

export const users = new Elysia({ prefix: '/users' })
  .post(
    '/login',
    async ({ body, error, set }) => {
      const user = await queries.user.selectUserByEmail(drizzle, body.email);

      if (!user) {
        throw error('Unauthorized', 'Invalid credentials');
      }

      if (user.password === null || user.googleId) {
        set.status = 401;
        return { message: 'Google user, use Google login' };
      }

      const isValidPassword = await argon.verify(user.password, body.password);
      if (!isValidPassword) {
        throw error('Unauthorized', 'Invalid credentials');
      }

      console.log('user', user);

      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      set.headers['Set-Cookie'] = sessionCookie.serialize();

      return { data: { email: user.email } };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )
  .post(
    '/register',
    async ({ body, error, set }) => {
      // check if a user with the same email already exists
      const existingUser = await queries.user.selectUserByEmail(drizzle, body.email);
      if (existingUser) {
        throw error('Bad Request', 'User with this email already exists');
      }

      const hashedPassword = await argon.hash(body.password);
      const user = await queries.user.insertUser(drizzle, {
        email: body.email,
        password: hashedPassword,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      if (!user) {
        throw error('Internal Server Error', 'Failed to create user');
      }

      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      set.headers['Set-Cookie'] = sessionCookie.serialize();

      return { data: { email: body.email } };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 2 }),
        lastName: t.String({ minLength: 2 }),
      }),
    },
  )
  .guard(
    {
      async beforeHandle({ headers, error }) {
        const isValidSession = await validateSession(headers.cookie ?? '');
        if (!isValidSession) {
          throw error('Unauthorized', 'Invalid session');
        }
      },
    },
    (app) =>
      app
        .resolve(async ({ headers }) => {
          return {
            userId: await getUserIdFromSession(headers.cookie ?? ''),
          };
        })
        .post('/logout', async ({ headers, set }) => {
          const sessionId = lucia.readSessionCookie(headers.cookie ?? '');
          if (!sessionId) {
            throw error('Unauthorized', 'Invalid session');
          }
          await lucia.invalidateSession(sessionId);
          const sessionCookie = lucia.createBlankSessionCookie();
          set.headers['Set-Cookie'] = sessionCookie.serialize();

          return { message: 'Logged out' };
        })
        .get('/loggedin', async ({ userId, error, headers }) => {
          if (!userId) {
            throw error('Unauthorized', 'Invalid session');
          }

          const user = await queries.user.selectUserById(drizzle, userId);

          if (!user) {
            const sessionId = lucia.readSessionCookie(headers.cookie ?? '');
            if (sessionId) {
              await lucia.invalidateSession(sessionId).catch(() => false);
            }
            throw error('Unauthorized', 'Invalid session');
          }

          const aiTrialsRemaining = getRemainingTrials(user.aiTrialCount ?? 0);

          return {
            data: {
              ...user,
              aiTrialsRemaining,
              hasOpenAiKey: Boolean(user.openAiApiKey),
              maskedOpenAiKey: maskOpenAiKey(user.openAiApiKey),
            },
          };
        })
        .post(
          '/openai-key',
          async ({ userId, body, error }) => {
            if (!userId) {
              throw error('Unauthorized', 'Invalid session');
            }

            const user = await queries.user.selectUserById(drizzle, userId);
            if (!user) {
              throw error('Unauthorized', 'Invalid session');
            }

            if (user.isPro) {
              throw error('Bad Request', 'Pro accounts use the shared OpenAI key');
            }

            try {
              const client = new OpenAI({ apiKey: body.apiKey });
              await client.models.list();
            } catch (_) {
              throw error('Bad Request', 'Invalid OpenAI API key');
            }

            const updatedUser = await queries.user.updateUserOpenAiKey(
              drizzle,
              userId,
              body.apiKey,
            );

            if (!updatedUser) {
              throw error('Internal Server Error', 'Failed to save OpenAI key');
            }

            return {
              data: {
                openAiApiKey: updatedUser.openAiApiKey,
                hasOpenAiKey: Boolean(updatedUser.openAiApiKey),
                maskedOpenAiKey: maskOpenAiKey(updatedUser.openAiApiKey),
              },
            };
          },
          {
            body: t.Object({
              apiKey: t.String({ minLength: 1 }),
            }),
          },
        )
        .delete('/openai-key', async ({ userId, error }) => {
          if (!userId) {
            throw error('Unauthorized', 'Invalid session');
          }

          const updatedUser = await queries.user.clearUserOpenAiKey(drizzle, userId);

          if (!updatedUser) {
            throw error('Internal Server Error', 'Failed to remove OpenAI key');
          }

          return {
            data: {
              openAiApiKey: updatedUser.openAiApiKey,
              hasOpenAiKey: false,
              maskedOpenAiKey: maskOpenAiKey(updatedUser.openAiApiKey),
            },
          };
        })
        .delete('/delete', async ({ userId, error, headers, set }) => {
          if (!userId) {
            throw error('Unauthorized', 'Invalid session');
          }

          const sessionId = lucia.readSessionCookie(headers.cookie ?? '');
          if (sessionId) {
            await lucia.invalidateSession(sessionId);
          }

          await queries.user.deleteUser(drizzle, userId);

          const sessionCookie = lucia.createBlankSessionCookie();
          set.headers['Set-Cookie'] = sessionCookie.serialize();

          return { message: 'Account deleted successfully' };
        }),
  );
