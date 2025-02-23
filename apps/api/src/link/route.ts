import Elysia, { t } from "elysia";
import { drizzle } from "..";
import {
  sql,
  eq,
  and,
  desc,
  notInArray,
  count,
  isNull,
  cosineDistance,
  gt,
} from "drizzle-orm";
import { getUserIdFromSession, validateSession } from "../auth";
import {
  insertScrapingJobSchema,
  LinkStateEnum,
  linkTable,
  linkTagTable,
  scrapingJobs,
  linkTagsToLinks,
} from "db/src/schema";
import { insertLinkSchema } from "db/src/zod.schema";
import {
  isURLReachable,
  extractTextFromNotes,
  convertTextToEmbeddings,
} from "./helper";

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
      .get(
        "",
        async ({ query, userId, set }) => {
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
              const similarity = sql<number>`1 - (${cosineDistance(linkTable.embedding, embedding)})`;
              total = await drizzle
                .select({ count: count() })
                .from(linkTable)
                .where(and(eq(linkTable.userId, userId), gt(similarity, 0.65)));
              links = await drizzle
                .select({
                  id: linkTable.id,
                  url: linkTable.url,
                  title: linkTable.title,
                  description: linkTable.description,
                  image: linkTable.image,
                  state: linkTable.state,
                  createdAt: linkTable.createdAt,
                  similarity: similarity,
                  tags: sql<Array<{ name: string; color: string }>>`
                  array_agg(
                    CASE 
                      WHEN ${linkTagTable.name} IS NOT NULL 
                      THEN json_build_object(
                        'name', ${linkTagTable.name},
                        'color', ${linkTagTable.color}
                      )
                      ELSE NULL 
                    END
                  )`,
                })
                .from(linkTable)
                .leftJoin(
                  linkTagsToLinks,
                  eq(linkTable.id, linkTagsToLinks.linkId)
                )
                .leftJoin(
                  linkTagTable,
                  eq(linkTagsToLinks.tagId, linkTagTable.id)
                )
                .where(
                  and(
                    eq(linkTable.userId, userId),
                    query.search ? gt(similarity, 0.7) : undefined,
                    cursor
                      ? sql`${linkTable.createdAt} < ${new Date(parseInt(cursor))}`
                      : undefined
                  )
                )
                .groupBy(
                  linkTable.id,
                  linkTable.url,
                  linkTable.title,
                  linkTable.description,
                  linkTable.image,
                  linkTable.state,
                  linkTable.createdAt
                )
                .orderBy((t) => desc(t.similarity))
                .limit(limit + 1);
              console.log(total);
              const titles = links.map((link) => link.title);
              console.log(titles);
            } else {
              total = await drizzle
                .select({ count: count() })
                .from(linkTable)
                .where(
                  and(
                    eq(linkTable.userId, userId),
                    query.search
                      ? sql`(
                          setweight(to_tsvector('english', COALESCE(${linkTable.title}, '')), 'A') ||
                          setweight(to_tsvector('english', COALESCE(${linkTable.description}, '')), 'B') ||
                          setweight(to_tsvector('english', COALESCE(${linkTable.notesText}, '')), 'C')
                        )
                        @@ websearch_to_tsquery('english', ${query.search})`
                      : undefined
                  )
                );

              links = await drizzle
                .select({
                  id: linkTable.id,
                  url: linkTable.url,
                  title: linkTable.title,
                  description: linkTable.description,
                  image: linkTable.image,
                  state: linkTable.state,
                  createdAt: linkTable.createdAt,
                  tags: sql<Array<{ name: string; color: string }>>`
                  array_agg(
                    CASE 
                      WHEN ${linkTagTable.name} IS NOT NULL 
                      THEN json_build_object(
                        'name', ${linkTagTable.name},
                        'color', ${linkTagTable.color}
                      )
                      ELSE NULL 
                    END
                  )`,
                })
                .from(linkTable)
                .leftJoin(
                  linkTagsToLinks,
                  eq(linkTable.id, linkTagsToLinks.linkId)
                )
                .leftJoin(
                  linkTagTable,
                  eq(linkTagsToLinks.tagId, linkTagTable.id)
                )
                .where(
                  and(
                    eq(linkTable.userId, userId),
                    query.search
                      ? sql`(
                        setweight(to_tsvector('english', COALESCE(${linkTable.title}, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(${linkTable.description}, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(${linkTable.notesText}, '')), 'C')
                      )
                      @@ websearch_to_tsquery('english', ${query.search})`
                      : undefined,
                    cursor
                      ? sql`${linkTable.createdAt} < ${new Date(parseInt(cursor))}`
                      : undefined
                  )
                )
                .groupBy(
                  linkTable.id,
                  linkTable.url,
                  linkTable.title,
                  linkTable.description,
                  linkTable.image,
                  linkTable.state,
                  linkTable.createdAt
                )
                .orderBy(desc(linkTable.createdAt))
                .limit(limit + 1);
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
            console.log(error);
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
      .delete(
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

          if (link[0].userId !== userId) {
            throw error("Forbidden", "You are not allowed to delete this link");
          }

          await drizzle.delete(linkTable).where(eq(linkTable.id, id));

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

          if (link[0].userId !== userId) {
            throw error("Forbidden", "You are not allowed to update this link");
          }

          await drizzle
            .update(linkTable)
            .set({
              title: body.title ?? undefined,
              description: body.description ?? undefined,
              image: body.image ?? undefined,
              url: body.url ?? undefined,
              notes: body.notes ?? undefined,
              notesText: body.notes
                ? extractTextFromNotes(JSON.parse(body.notes))
                : undefined,
            })
            .where(eq(linkTable.id, id));

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
        const linkTags = await drizzle
          .select({
            id: linkTagTable.id,
            name: linkTagTable.name,
            color: linkTagTable.color,
            isSystem: linkTagTable.isSystem,
          })
          .from(linkTagsToLinks)
          .innerJoin(linkTagTable, eq(linkTagsToLinks.tagId, linkTagTable.id))
          .where(eq(linkTagsToLinks.linkId, id));
        if (linkTags.length === 0) {
          const allSystemTags = await drizzle
            .select()
            .from(linkTagTable)
            .where(eq(linkTagTable.isSystem, true));
          return { data: { linkTags: [], otherAvailableTags: allSystemTags } };
        }

        const otherAvailableTags = await drizzle
          .select()
          .from(linkTagTable)
          .where(
            and(
              eq(linkTagTable.isSystem, true),
              notInArray(
                linkTagTable.id,
                linkTags.map((tag) => tag.id)
              )
            )
          );

        return {
          data: { linkTags: linkTags, otherAvailableTags: otherAvailableTags },
        };
      })
      .put(
        "/:id/tags",
        async ({ userId, params: { id }, body, error }) => {
          return await drizzle.transaction(async (tx) => {
            // First verify the link exists and belongs to the user
            const link = await tx
              .select()
              .from(linkTable)
              .where(
                and(
                  eq(linkTable.id, id),
                  eq(linkTable.userId, userId as string)
                )
              )
              .limit(1);

            if (link.length === 0) {
              throw error("Not Found", "Link not found");
            }

            // Delete existing tag relations for this link
            await tx
              .delete(linkTagsToLinks)
              .where(eq(linkTagsToLinks.linkId, id));

            // Process each tag
            for (const tag of body.tags) {
              let tagId = tag.id;

              // If no id, create new tag
              if (!tagId) {
                const [newTag] = await tx
                  .insert(linkTagTable)
                  .values({
                    name: tag.name,
                    color: tag.color,
                    userId,
                    isSystem: false,
                  })
                  .returning({ id: linkTagTable.id });

                tagId = newTag.id;
              }

              // Create relation between link and tag
              await tx.insert(linkTagsToLinks).values({
                linkId: id,
                tagId,
              });
            }

            return { status: "success", message: "Tags updated successfully" };
          });
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
      .put("/embeddings", async ({ userId, set }) => {
        try {
          // Get all the users links with the embeddings not set
          const links = await drizzle
            .select()
            .from(linkTable)
            .where(
              and(
                eq(linkTable.userId, userId as string),
                isNull(linkTable.embedding)
              )
            );
          for (const link of links) {
            const embeddings = await convertTextToEmbeddings(
              link.title + " " + link.description + " " + link.notesText
            );
            await drizzle
              .update(linkTable)
              .set({ embedding: embeddings })
              .where(eq(linkTable.id, link.id));
          }
          return { status: "success", message: "Embeddings updated" };
        } catch (error) {
          console.log(error);
          set.status = 500;
          return { status: "error", message: "Failed to update embeddings" };
        }
      })
);
