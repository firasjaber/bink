import Elysia from 'elysia';
import { generateGoogleAuthUrl, oauth2Client } from '../oauth/google';
import { drizzle } from '..';
import { lucia } from '../lucia';
import * as queries from 'db/src/queries';
import { logger } from '@bogeychan/elysia-logger';

export const googleAuth = new Elysia({ prefix: '/auth/google' })
  .use(logger())
  .get('/', async () => {
    const url = generateGoogleAuthUrl();
    return { url };
  })
  .get('/callback', async ({ query, error, set, log }) => {
    const { code } = query;

    if (!code) {
      throw error(400, 'Authorization code required');
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const userinfo = await oauth2Client.request<{
        id: string;
        email: string;
        given_name: string;
        family_name: string;
        picture: string;
      }>({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      const {
        id: googleId,
        email,
        given_name: firstName,
        family_name: lastName,
        picture: profilePicture,
      } = userinfo.data;

      // Check if user exists
      const existingUser = await queries.user.selectUserByGoogleId(drizzle, googleId);

      let userId: string;

      if (!existingUser) {
        // Create new user
        const newUser = await queries.user.insertUser(drizzle, {
          email,
          firstName,
          lastName,
          googleId,
          profilePicture,
        });

        if (!newUser) {
          throw error('Internal Server Error', 'Failed to create user');
        }

        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }

      // Create session
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      set.headers['Set-Cookie'] = sessionCookie.serialize();

      return {
        email,
      };
    } catch (error) {
      log.error(error, 'Error occured whilehandling google auth callback');
      set.status = 500;
    }
  });
