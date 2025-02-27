import type { JSONContent } from "novel";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src";

const client = treaty<App>("localhost:3000", {
  fetch: {
    credentials: "include",
    mode: "cors",
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
  try {
    const res = await client.users.loggedin.get();
    return res.data?.data;
  } catch (_) {
    localStorage.removeItem("sessionId");
    return null;
  }
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

export const getLinks = async (
  cursor: string | null,
  search?: string,
  smartSearch?: boolean
) => {
  const query: { cursor?: string; search?: string; smartSearch?: boolean } = {};
  if (cursor) {
    query.cursor = cursor;
  }
  if (search) {
    query.search = search;
  }
  if (smartSearch) {
    query.smartSearch = smartSearch;
  }

  const res = await client.links.get({ query });

  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data;
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
    notes?: JSONContent;
  }
) => {
  const res = await client.links({ id }).put({
    ...data,
    notes: data.notes ? JSON.stringify(data.notes) : undefined,
  });
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data;
};

export const updateLinkTags = async (
  id: string,
  data: { tags: { id?: string; name: string; color: string }[] }
) => {
  const res = await client.links({ id }).tags.put(data);
  if (res.error) {
    throw new Error(res.error.value as string);
  }
  return res.data;
};

export const updateLinkEmbeddings = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const res = await client.links.embeddings.put();
  if (res.error) {
    throw new Error(res.error.value as string);
  }
};

export const getGoogleAuthUrl = async () => {
  const response = await client.auth.google.get();
  if (response.error) {
    throw new Error(response.error.value as string);
  }
  return response.data.url;
};

export const googleAuthCallback = async (code: string) => {
  const response = await client.auth.google.callback.get({ query: { code } });
  if (response.error) {
    throw new Error(response.error.value as string);
  }

  return response.data;
};
