import Elysia, { t } from "elysia";
import { drizzle } from "..";
import { sql, eq, and, desc, notInArray } from "drizzle-orm";
import { getUserIdFromSession, validateSession } from "../auth";
import {
  insertLinkSchema,
  insertScrapingJobSchema,
  LinkStateEnum,
  linkTable,
  linkTagTable,
  scrapingJobs,
  linkTagsToLinks,
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
      .get("", async ({ userId }) => {
        const links = await drizzle
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
          .leftJoin(linkTagsToLinks, eq(linkTable.id, linkTagsToLinks.linkId))
          .leftJoin(linkTagTable, eq(linkTagsToLinks.tagId, linkTagTable.id))
          .where(sql`${linkTable.userId} = ${userId}`)
          .groupBy(
            linkTable.id,
            linkTable.url,
            linkTable.title,
            linkTable.description,
            linkTable.image,
            linkTable.state,
            linkTable.createdAt
          )
          .orderBy(desc(linkTable.createdAt));

        // Transform the response to handle null tags
        const transformedLinks = links.map((link) => ({
          ...link,
          tags: link.tags?.[0] === null ? [] : link.tags ?? [],
        }));

        return { data: transformedLinks };
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
      .get("/:id/tags", async ({ userId, params: { id }, error }) => {
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
);
