import { hash } from '@node-rs/argon2';
import { initDrizzle } from '../src/client';
import { LinkStateEnum, linkTable, linkTagTable, scrapingJobs, userTable } from '../src/schema';

async function seed() {
  const db = await initDrizzle('postgres://user:password@localhost:5433/db');
  // Create system tags
  const systemTags = [
    { name: 'Technology', color: '#EF4444', isSystem: true },
    { name: 'Health', color: '#10B981', isSystem: true },
    { name: 'Finance', color: '#3B82F6', isSystem: true },
    { name: 'Science', color: '#F59E0B', isSystem: true },
    { name: 'Entertainment', color: '#6366F1', isSystem: true },
    { name: 'Reading', color: '#8B5CF6', isSystem: true },
  ];

  // Insert system tags
  console.log('Inserting system tags...');
  await db.insert(linkTagTable).values(systemTags);

  // Create test user
  const hashedPassword = await hash('123123123');
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'local@mail.com',
    password: hashedPassword,
  };

  console.log('Creating test user...');
  const user = await db.insert(userTable).values(testUser).returning();

  if (!user || user.length === 0) {
    throw new Error('Failed to create test user');
  }

  const demoLinks = [
    {
      url: 'https://www.youtube.com/watch?v=fYqMPvPvVAc',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://orm.drizzle.team/docs/guides/vector-similarity-search',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://thelinuxcode.com/the-seasoned-developers-guide-to-switching-jobs/',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://www.joshwcomeau.com/react/why-react-re-renders/',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://en.wikipedia.org/wiki/Disjunctive_normal_form',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://www.youtube.com/watch?v=fYqMPvPvVAc',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://21st.dev/',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
    {
      url: 'https://www.youtube.com/watch?v=fYqMPvPvVAc',
      state: LinkStateEnum.PROCESSED,
      userId: user[0].id,
    },
  ];

  console.log('Inserting demo links...');
  const linksResult = await db
    .insert(linkTable)
    .values(demoLinks)
    .returning({ id: linkTable.id, url: linkTable.url });

  console.log('creating scrape tasks');
  const scrapeTasks = linksResult.map((link) => ({
    url: link.url,
    event: 'scrape_og' as const,
    priority: 1,
    linkId: link.id,
  }));
  await db.insert(scrapingJobs).values(scrapeTasks);
  console.log('Seeding completed successfully!');
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
