import Elysia, { t } from "elysia";
import { drizzle } from "..";
import { getUserIdFromSession, validateSession } from "../auth";
import { LinkStateEnum } from "db/src/schema";
import { insertLinkSchema } from "db/src/zod.schema";
import {
  isURLReachable,
  extractTextFromNotes,
  convertTextToEmbeddings,
} from "./helper";
import * as queries from "db/src/queries";
import { logger } from "@bogeychan/elysia-logger";

export const links = new Elysia({ prefix: "/links" }).use(logger()).guard(
  {
    async beforeHandle({ headers, error }) {
      const isValidSession = await validateSession(headers.cookie ?? "");
      if (!isValidSession) {
        throw error("Unauthorized", "Invalid session");
      }
    },
  },
  (app) =>
    app
      .resolve(async ({ headers }) => {
        return {
          userId: await getUserIdFromSession(headers.cookie ?? ""),
        };
      })
      .get(
        "",
        async ({ query, userId, set, log }) => {
          log.info("get links");
          if (userId === null) {
            set.status = 401;
            return {
              error: "Unauthorized",
            };
          }
          try {
            const { cursor, limit = 12 } = query;
            let links = [];
            let total: { count: number }[] = [{ count: 0 }];
            if (query.smartSearch && query.search) {
              const embedding = await convertTextToEmbeddings(query.search);
              const { total: resultTotal, links: resultLinks } =
                await queries.link.selectLinksByEmbeddingSimilarity(
                  drizzle,
                  userId,
                  embedding,
                  limit,
                  cursor,
                  query.search
                );
              total = resultTotal;
              links = resultLinks;
            } else {
              const { total: resultTotal, links: resultLinks } =
                await queries.link.selectLinksByFullTextSearch(
                  drizzle,
                  userId,
                  limit,
                  query.search,
                  cursor
                );
              total = resultTotal;
              links = resultLinks;
            }

            // Transform the response to handle null tags
            const transformedLinks = links.map((link) => ({
              ...link,
              tags: link.tags?.[0] === null ? [] : link.tags ?? [],
            }));

            // Check if there are more results
            const hasMore = transformedLinks.length > limit;
            const results = transformedLinks.slice(0, limit);

            // Generate next cursor if there are more results
            const nextCursor = hasMore
              ? results[results.length - 1].createdAt.getTime().toString()
              : null;

            return {
              data: results,
              nextCursor,
              total: total[0].count,
            };
          } catch (error) {
            log.error(error, "Error getting links");
            set.status = 500;
            return {
              error: "Internal Server Error",
            };
          }
        },
        {
          query: t.Object({
            cursor: t.Optional(t.String()),
            limit: t.Optional(t.Number()),
            search: t.Optional(t.String()),
            smartSearch: t.Optional(t.Boolean()),
          }),
        }
      )
      .get(
        "/:id",
        async ({ userId, params: { id }, error }) => {
          if (!userId) {
            throw error("Unauthorized", "Invalid session");
          }

          const link = await queries.link.selectLinkById(drizzle, id, userId);

          if (!link) {
            throw error("Not Found", "Link not found");
          }

          return { data: link };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .post(
        "",
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

          const dbLink = await queries.link.insertLink(drizzle, link);

          const job = {
            event: "scrape_og" as const,
            url: link.url,
            linkId: dbLink.id,
            priority: 1,
          };

          // add the srapeOg job to the queue
          await queries.scrapingJobs.insertScrapingJob(drizzle, job);

          return { status: "success", message: "Link created" };
        },
        {
          body: t.Object({
            url: t.String(),
          }),
        }
      )
      .delete(
        "/:id",
        async ({ userId, params: { id }, error }) => {
          if (!userId) {
            throw error("Unauthorized", "Invalid session");
          }

          const link = await queries.link.selectLinkById(drizzle, id, userId);

          if (!link) {
            throw error("Not Found", "Link not found");
          }

          if (link.userId !== userId) {
            throw error("Forbidden", "You are not allowed to delete this link");
          }

          await queries.link.deleteLink(drizzle, id);

          return { status: "success", message: "Link deleted" };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .put(
        "/:id",
        async ({ userId, params: { id }, body, error }) => {
          if (!userId) {
            throw error("Unauthorized", "Invalid session");
          }

          const link = await queries.link.selectLinkById(drizzle, id, userId);

          if (!link) {
            throw error("Not Found", "Link not found");
          }

          if (link.userId !== userId) {
            throw error("Forbidden", "You are not allowed to update this link");
          }

          await queries.link.updateLink(drizzle, id, {
            title: body.title ?? undefined,
            description: body.description ?? undefined,
            image: body.image ?? undefined,
            url: body.url ?? undefined,
            notes: body.notes ?? undefined,
            notesText: body.notes
              ? extractTextFromNotes(JSON.parse(body.notes))
              : undefined,
          });

          return { status: "success", message: "Link updated" };
        },
        {
          body: t.Object({
            title: t.Optional(t.String()),
            description: t.Optional(t.String()),
            image: t.Optional(t.String()),
            url: t.Optional(t.String()),
            notes: t.Optional(t.String()),
          }),
          params: t.Object({
            id: t.String(),
          }),
        }
      )
      .get("/:id/tags", async ({ params: { id } }) => {
        const linkTags = await queries.link.selectLinkTags(drizzle, id);
        if (linkTags.length === 0) {
          const allSystemTags =
            await queries.link.selectAllSystemLinkTags(drizzle);
          return { data: { linkTags: [], otherAvailableTags: allSystemTags } };
        }

        const otherAvailableTags =
          await queries.link.selectLinkOtherAvailableTagsByLinkIds(
            drizzle,
            linkTags.map((tag) => tag.link_tag.id)
          );

        return {
          data: { linkTags: linkTags, otherAvailableTags: otherAvailableTags },
        };
      })
      .put(
        "/:id/tags",
        async ({ userId, params: { id }, body, error }) => {
          if (!userId) {
            throw error("Unauthorized", "Invalid session");
          }

          try {
            await queries.link.deleteLinkTagsByLinkId(
              drizzle,
              id,
              userId,
              body.tags
            );
          } catch (_) {
            throw error("Not Found", "Link not found");
          }

          return { status: "success", message: "Link tags updated" };
        },
        {
          body: t.Object({
            tags: t.Array(
              t.Object({
                id: t.Optional(t.String()),
                name: t.String(),
                color: t.String(),
              })
            ),
          }),
        }
      )
      .put("/embeddings", async ({ userId, set, error, log }) => {
        try {
          if (!userId) {
            throw error("Unauthorized", "Invalid session");
          }
          // Get all the users links with the embeddings not set
          const links = await queries.link.selectLinksByUserIdWithoutEmbedding(
            drizzle,
            userId
          );
          for (const link of links) {
            const embeddings = await convertTextToEmbeddings(
              link.title + " " + link.description + " " + link.notesText
            );
            await queries.link.updateLinkEmbedding(
              drizzle,
              link.id,
              embeddings
            );
          }
          return { status: "success", message: "Embeddings updated" };
        } catch (error) {
          log.error(error, "Error updating embeddings");
          set.status = 500;
          return { status: "error", message: "Failed to update embeddings" };
        }
      })
);
