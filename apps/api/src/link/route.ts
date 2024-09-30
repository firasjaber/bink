import Elysia, { t } from 'elysia';
import { drizzle } from '..';
import { sql } from 'drizzle-orm';
import { getUserIdFromSession, validateSession } from '../auth';
import { insertLinkSchema, LinkStateEnum, linkTable } from 'db/src/schema';
import { isURLReachable } from './parser';

export const links = new Elysia({ prefix: '/links' }).guard(
  {
    async beforeHandle({ headers: { authorization }, error }) {
      const isValidSession = await validateSession(authorization ?? '');
      if (!authorization || !isValidSession) {
        throw error('Unauthorized', 'Invalid session');
      }
    },
  },
  (app) =>
    app
      .resolve(async ({ headers: { authorization } }) => {
        return {
          userId: await getUserIdFromSession(authorization ?? ''),
        };
      })
      .get('/', async ({ userId }) => {
        const links = await drizzle
          .select({
            id: linkTable.id,
            url: linkTable.url,
            title: linkTable.title,
            description: linkTable.description,
            image: linkTable.image,
            state: linkTable.state,
            createdAt: linkTable.createdAt,
          })
          .from(linkTable)
          .where(sql`user_id = ${userId}`);
        return { data: links };
      })
      .post(
        '/',
        async ({ userId, body, error }) => {
          // validate the url
          if (!(await isURLReachable(body.url))) {
            throw error('Bad Request', 'Invalid URL');
          }

          const link = insertLinkSchema.parse({
            url: body.url,
            state: LinkStateEnum.PROCESSING,
            userId,
          });

          await drizzle.insert(linkTable).values(link);

          return { status: 'success', message: 'Link created' };
        },
        {
          body: t.Object({
            url: t.String(),
          }),
        },
      ),
);
