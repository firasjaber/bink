import { userTable } from '../schema';
import { initDrizzle } from '../client';
import { eq } from 'drizzle-orm';

export async function selectUserByEmail(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  email: string,
) {
  const user = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function selectUserById(db: Awaited<ReturnType<typeof initDrizzle>>, id: string) {
  const user = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function selectUserByGoogleId(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  googleId: string,
) {
  const user = await db.select().from(userTable).where(eq(userTable.googleId, googleId)).limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}
export async function insertUser(
  db: Awaited<ReturnType<typeof initDrizzle>>,
  data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    googleId?: string;
    profilePicture?: string;
  },
) {
  const user = await db
    .insert(userTable)
    .values({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      googleId: data.googleId,
      profilePicture: data.profilePicture,
    })
    .returning();

  if (user.length === 0) {
    return null;
  }

  return user[0];
}
