import Elysia, { error, t, ValidationError } from "elysia";
import { lucia } from "../lucia";
import { userTable } from "db";
import { drizzle } from "..";
import { sql } from "drizzle-orm";
import argon from "argon2";
import { getUserIdFromSession, validateSession } from "../auth";

export const users = new Elysia({ prefix: "/users" })
  .post(
    "/login",
    async ({ body, error }) => {
      const users = await drizzle
        .select()
        .from(userTable)
        .where(sql`email = ${body.email}`)
        .limit(1);

      if (users.length === 0) {
        throw error("Unauthorized", "Invalid credentials");
      }

      const user = users[0];
      const isValidPassword = await argon.verify(user.password, body.password);
      if (!isValidPassword) {
        throw error("Unauthorized", "Invalid credentials");
      }

      const session = await lucia.createSession(user.id, {});
      return { data: { email: user.email, sessionId: session.id } };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post(
    "/register",
    async ({ body, error }) => {
      // check if a user with the same email already exists
      const existingUser = await drizzle
        .select()
        .from(userTable)
        .where(sql`email = ${body.email}`)
        .limit(1);
      if (existingUser.length) {
        throw error("Bad Request", "User with this email already exists");
      }

      const hashedPassword = await argon.hash(body.password);
      const users = await drizzle
        .insert(userTable)
        .values({
          email: body.email,
          password: hashedPassword,
          firstName: body.firstName,
          lastName: body.lastName,
        })
        .returning();

      if (users.length === 0) {
        throw error("Internal Server Error", "Failed to create user");
      }

      const session = await lucia.createSession(users[0].id, {});

      return { data: { email: body.email, sessionId: session.id } };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 2 }),
        lastName: t.String({ minLength: 2 }),
      }),
    }
  )
  .guard(
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
        .post("/logout", async ({ headers: { authorization } }) => {
          const sessionId = lucia.readBearerToken(authorization ?? "");
          if (!sessionId) {
            throw error("Unauthorized", "Invalid session");
          }
          return { message: "Logged out" };
        })
        .get(
          "/loggedin",
          async ({ userId, error, headers: { authorization } }) => {
            const users = await drizzle
              .select({
                id: userTable.id,
                firstName: userTable.firstName,
                lastName: userTable.lastName,
                email: userTable.email,
                createdAt: userTable.createdAt,
              })
              .from(userTable)
              .where(sql`id = ${userId}`)
              .limit(1);
            if (users.length === 0) {
              await lucia
                .invalidateSession(authorization ?? "")
                .catch(() => false);
              throw error("Internal Server Error", "User not found");
            }
            return { data: users[0] };
          }
        )
  );
