import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src";

const client = treaty<App>("localhost:3000", {
  onRequest: () => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      return {
        headers: { authorization: `Bearer ${sessionId}` },
      };
    }
    return {};
  },
});

export const signIn = async (data: { email: string; password: string }) => {
  const res = await client.users.login.post(data);
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data.data;
};

export const signUp = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}) => {
  const response = await client.users.register.post(data);
  if (response.error) {
    throw new Error(response.error.value as string);
  }
  return response.data.data;
};

export const getLoggedInUser = async () => {
  const res = await client.users.loggedin.get();
  return res.data?.data;
};

export const logout = async () => {
  return await client.users.logout.post();
};

export const createLink = async (data: { url: string }) => {
  const res = await client.links.post(data);
  if (res.error) {
    throw new Error(res.error.value as string);
  }
};

export const getLinks = async () => {
  const res = await client.links.get();

  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data?.data;
};

export const getLink = async (id: string) => {
  const res = await client.links({ id }).get();
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data?.data;
};

export const getLinkTags = async (id: string) => {
  const res = await client.links({ id }).tags.get();
  console.log(res);
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data?.data;
};

export const deleteLink = async (id: string) => {
  const res = await client.links({ id }).delete();
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data;
};

export const updateLink = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  }
) => {
  const res = await client.links({ id }).put(data);
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data;
};
