import Elysia, { t } from "elysia";
import { drizzle } from "..";
import { sql, eq, and, desc } from "drizzle-orm";
import { getUserIdFromSession, validateSession } from "../auth";
import {
  insertLinkSchema,
  insertScrapingJobSchema,
  LinkStateEnum,
  linkTable,
  scrapingJobs,
} from "db/src/schema";
import { isURLReachable } from "./helper";

export const links = new Elysia({ prefix: "/links" }).guard(
  {
    async beforeHandle({ headers: { authorization }, error }) {
      const isValidSession = await validateSession(authorization ?? "");
      if (!authorization || !isValidSession) {
        throw error("Unauthorized", "Invalid session");
      }
    },
  },
  (app) =>
    app
      .resolve(async ({ headers: { authorization } }) => {
        return {
          userId: await getUserIdFromSession(authorization ?? ""),
        };
      })
      .get("/", async ({ userId }) => {
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
          .where(sql`user_id = ${userId}`)
          .orderBy(desc(linkTable.createdAt));
        return { data: links };
      })
      .get(
        "/:id",
        async ({ userId, params: { id }, error }) => {
          const link = await drizzle
            .select()
            .from(linkTable)
            .where(
              and(eq(linkTable.id, id), eq(linkTable.userId, userId as string))
            )
            .limit(1);

          if (link.length === 0) {
            throw error("Not Found", "Link not found");
          }

          return { data: link[0] };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .post(
        "/",
        async ({ userId, body, error }) => {
          // validate the url
          if (!(await isURLReachable(body.url))) {
            throw error("Bad Request", "Invalid URL");
          }

          const link = insertLinkSchema.parse({
            url: body.url,
            state: LinkStateEnum.PROCESSING,
            userId,
          });

          const dbLink = await drizzle
            .insert(linkTable)
            .values(link)
            .returning();

          const job = insertScrapingJobSchema.parse({
            event: "scrape_og",
            url: link.url,
            linkId: dbLink[0].id,
            priority: 1,
          });

          // add the srapeOg job to the queue
          await drizzle.insert(scrapingJobs).values(job);

          return { status: "success", message: "Link created" };
        },
        {
          body: t.Object({
            url: t.String(),
          }),
        }
      )
);
