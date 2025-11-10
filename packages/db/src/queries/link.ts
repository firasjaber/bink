import {
  and,
  cosineDistance,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { initDrizzle } from '../client';
import { linkTable, linkTagTable, linkTagsToLinks } from '../schema';

export async function selectLinksByUserId(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
) {
  const links = await db.select().from(linkTable).where(eq(linkTable.userId, userId));
  return links;
}

export async function selectLinkById(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  userId: string,
) {
  const link = await db
    .select()
    .from(linkTable)
    .where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId)));

  if (link.length === 0) {
    return null;
  }

  return link[0];
}

export async function selectLinksByEmbeddingSimilarity(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
  embedding: number[],
  limit: number,
  cursor?: string,
) {
  const similarity = sql<number>`1 - (${cosineDistance(linkTable.embedding, embedding)})`;
  console.log(similarity);

  // Build consistent base conditions
  const baseConditions = and(eq(linkTable.userId, userId), gt(similarity, 0.25));

  const total = await db
    .select({ count: countDistinct(linkTable.id) })
    .from(linkTable)
    .leftJoin(linkTagsToLinks, eq(linkTable.id, linkTagsToLinks.linkId))
    .where(baseConditions);

  const links = await db
    .select({
      id: linkTable.id,
      url: linkTable.url,
      title: linkTable.title,
      description: linkTable.description,
      image: linkTable.image,
      state: linkTable.state,
      createdAt: linkTable.createdAt,
      similarity: similarity,
      tags: sql<{ name: string; color: string }[]>`
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'name', ${linkTagTable.name},
                        'color', ${linkTagTable.color}
                      )
                    ) FILTER (WHERE ${linkTagTable.id} IS NOT NULL),
                    '[]'::json
                  )`,
    })
    .from(linkTable)
    .leftJoin(linkTagsToLinks, eq(linkTable.id, linkTagsToLinks.linkId))
    .leftJoin(linkTagTable, eq(linkTagsToLinks.tagId, linkTagTable.id))
    .where(
      and(
        baseConditions,
        cursor ? sql`${linkTable.createdAt} < ${new Date(parseInt(cursor))}` : undefined,
      ),
    )
    .groupBy(
      linkTable.id,
      linkTable.url,
      linkTable.title,
      linkTable.description,
      linkTable.image,
      linkTable.state,
      linkTable.createdAt,
    )
    .orderBy((t) => desc(t.similarity))
    .limit(limit + 1);
  return { total: total, links };
}

export async function selectLinksByFullTextSearch(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
  limit: number,
  searchQuery?: string,
  cursor?: string,
  tagIds?: string[],
) {
  // Special case: if tagIds contains "__NO_TAGS__", show links with no tags
  const isNoTagsFilter = tagIds && tagIds.length === 1 && tagIds[0] === '__NO_TAGS__';

  // Build base conditions for links
  const baseLinkConditions = and(
    eq(linkTable.userId, userId),
    searchQuery
      ? sql`(
                      setweight(to_tsvector('english', COALESCE(${linkTable.title}, '')), 'A') ||
                      setweight(to_tsvector('english', COALESCE(${linkTable.description}, '')), 'B') ||
                      setweight(to_tsvector('english', COALESCE(${linkTable.notesText}, '')), 'C')
                    )
                    @@ websearch_to_tsquery('english', ${searchQuery})`
      : undefined,
    cursor ? sql`${linkTable.createdAt} < ${new Date(parseInt(cursor))}` : undefined,
  );

  // Build tag filtering conditions
  const tagFilterCondition = isNoTagsFilter
    ? sql`${linkTable.id} NOT IN (SELECT DISTINCT ${linkTagsToLinks.linkId} FROM ${linkTagsToLinks})`
    : tagIds && tagIds.length > 0
      ? sql`${linkTable.id} IN (
          SELECT DISTINCT ${linkTagsToLinks.linkId} 
          FROM ${linkTagsToLinks} 
          WHERE ${inArray(linkTagsToLinks.tagId, tagIds)}
        )`
      : undefined;

  // For total count - simplified query without cursor
  const totalConditions = and(
    eq(linkTable.userId, userId),
    searchQuery
      ? sql`(
                      setweight(to_tsvector('english', COALESCE(${linkTable.title}, '')), 'A') ||
                      setweight(to_tsvector('english', COALESCE(${linkTable.description}, '')), 'B') ||
                      setweight(to_tsvector('english', COALESCE(${linkTable.notesText}, '')), 'C')
                    )
                    @@ websearch_to_tsquery('english', ${searchQuery})`
      : undefined,
    tagFilterCondition,
  );

  const total = await db
    .select({ count: count(linkTable.id) })
    .from(linkTable)
    .where(totalConditions);

  // For links query - use subquery approach to avoid GROUP BY issues with cursor
  const linksConditions = and(baseLinkConditions, tagFilterCondition);

  const links = await db
    .select({
      id: linkTable.id,
      url: linkTable.url,
      title: linkTable.title,
      description: linkTable.description,
      image: linkTable.image,
      state: linkTable.state,
      createdAt: linkTable.createdAt,
      tags: sql<Array<{ name: string; color: string }>>`
                  COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object('name', ${linkTagTable.name}, 'color', ${linkTagTable.color})
                      )
                      FROM ${linkTagsToLinks}
                      JOIN ${linkTagTable} ON ${linkTagsToLinks.tagId} = ${linkTagTable.id}
                      WHERE ${linkTagsToLinks.linkId} = "link"."id"
                    ),
                    '[]'::json
                  )`,
    })
    .from(linkTable)
    .where(linksConditions)
    .orderBy(desc(linkTable.createdAt))
    .limit(limit + 1);

  return { total, links };
}

export async function update(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  data: {
    title?: string;
    description?: string;
    image?: string;
    state?: 'processed' | 'failed' | 'processed';
  },
) {
  return db.update(linkTable).set(data).where(eq(linkTable.id, linkId));
}

export async function insertLink(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  link: {
    url: string;
    userId: string;
    state: 'processing' | 'processed' | 'failed';
  },
) {
  const dbLink = await db.insert(linkTable).values(link).returning();
  return dbLink[0];
}

export async function deleteLink(db: Awaited<ReturnType<typeof initDrizzle>>, linkId: string) {
  return db.delete(linkTable).where(eq(linkTable.id, linkId));
}

export async function updateLink(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  data: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    notes?: string;
    notesText?: string;
  },
) {
  return db.update(linkTable).set(data).where(eq(linkTable.id, linkId));
}

export async function selectLinkTags(db: Awaited<ReturnType<typeof initDrizzle>>, linkId: string) {
  return db
    .select({
      id: linkTagTable.id,
      name: linkTagTable.name,
      color: linkTagTable.color,
    })
    .from(linkTagsToLinks)
    .innerJoin(linkTagTable, eq(linkTagsToLinks.tagId, linkTagTable.id))
    .where(eq(linkTagsToLinks.linkId, linkId));
}

export async function selectAllSystemLinkTags(db: Awaited<ReturnType<typeof initDrizzle>>) {
  return db.select().from(linkTagTable).where(eq(linkTagTable.isSystem, true));
}

export async function selectAllUserTags(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
) {
  return db
    .select({
      id: linkTagTable.id,
      name: linkTagTable.name,
      color: linkTagTable.color,
      isSystem: linkTagTable.isSystem,
    })
    .from(linkTagTable)
    .where(or(eq(linkTagTable.isSystem, true), eq(linkTagTable.userId, userId)))
    .orderBy(linkTagTable.name);
}

export async function selectLinkOtherAvailableTagsByLinkIds(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  currentLinkTags: string[],
) {
  return db
    .select()
    .from(linkTagTable)
    .where(and(notInArray(linkTagTable.id, currentLinkTags), eq(linkTagTable.isSystem, true)));
}

export async function selectLinkOtherAvailableTagsByLinkIdsExcludingSystem(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  currentLinkTags: string[],
  userId: string,
) {
  return db
    .select()
    .from(linkTagTable)
    .where(and(notInArray(linkTagTable.id, currentLinkTags), eq(linkTagTable.userId, userId)));
}

export async function deleteLinkTagsByLinkId(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  userId: string,
  newTags: {
    id?: string;
    name: string;
    color: string;
  }[],
) {
  return db.transaction(async (tx) => {
    // First verify the link exists and belongs to the user
    const link = await tx
      .select()
      .from(linkTable)
      .where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId as string)))
      .limit(1);

    if (link.length === 0) {
      throw new Error('Link not found');
    }

    // Delete existing tag relations for this link
    await tx.delete(linkTagsToLinks).where(eq(linkTagsToLinks.linkId, linkId));

    // Process each tag
    for (const tag of newTags) {
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
        linkId,
        tagId,
      });
    }
  });
}

export async function selectLinksByUserIdWithoutEmbedding(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
) {
  return db
    .select()
    .from(linkTable)
    .where(and(eq(linkTable.userId, userId), isNull(linkTable.embedding)));
}

export async function updateLinkEmbedding(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  linkId: string,
  embedding: number[],
) {
  return db.update(linkTable).set({ embedding }).where(eq(linkTable.id, linkId));
}

export async function selectAllLinksWithTagsForExport(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  userId: string,
) {
  return db
    .select({
      id: linkTable.id,
      url: linkTable.url,
      title: linkTable.title,
      description: linkTable.description,
      createdAt: linkTable.createdAt,
      tags: sql<Array<{ name: string; color: string }>>`
                  COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object('name', ${linkTagTable.name}, 'color', ${linkTagTable.color})
                      )
                      FROM ${linkTagsToLinks}
                      JOIN ${linkTagTable} ON ${linkTagsToLinks.tagId} = ${linkTagTable.id}
                      WHERE ${linkTagsToLinks.linkId} = "link"."id"
                    ),
                    '[]'::json
                  )`,
    })
    .from(linkTable)
    .where(eq(linkTable.userId, userId))
    .orderBy(desc(linkTable.createdAt));
}
