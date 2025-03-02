import Elysia, { error, t } from 'elysia';
import { lucia } from '../lucia';
import { drizzle } from '..';
import argon from 'argon2';
import { getUserIdFromSession, validateSession } from '../auth';
import * as queries from 'db/src/queries';

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
          return { data: user };
        }),
  );
