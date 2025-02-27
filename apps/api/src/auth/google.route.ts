import Elysia from "elysia";
import { generateGoogleAuthUrl, oauth2Client } from "../oauth/google";
import { drizzle } from "..";
import { userTable } from "db";
import { lucia } from "../lucia";
import { eq } from "drizzle-orm";

export const googleAuth = new Elysia({ prefix: "/auth/google" })
  .get("/", async () => {
    const url = generateGoogleAuthUrl();
    return { url };
  })
  .get("/callback", async ({ query, error, set }) => {
    const { code } = query;

    if (!code) {
      throw error(400, "Authorization code required");
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
        url: "https://www.googleapis.com/oauth2/v2/userinfo",
      });

      const {
        id: googleId,
        email,
        given_name: firstName,
        family_name: lastName,
        picture: profilePicture,
      } = userinfo.data;

      // Check if user exists
      const existingUser = await drizzle
        .select()
        .from(userTable)
        .where(eq(userTable.googleId, googleId))
        .limit(1);

      let userId: string;

      if (existingUser.length === 0) {
        // Create new user
        const [newUser] = await drizzle
          .insert(userTable)
          .values({
            email,
            firstName,
            lastName,
            googleId,
            profilePicture,
          })
          .returning({ id: userTable.id });

        userId = newUser.id;
      } else {
        userId = existingUser[0].id;
      }

      // Create session
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      set.headers["Set-Cookie"] = sessionCookie.serialize();

      return {
        email,
      };
    } catch (error) {
      // if (error instanceof OAuthRequestError) {
      //   console.log(error);
      //   set.status = 400;
      //   return;
      // }
      console.error(error);
      set.status = 500;
    }
  });
