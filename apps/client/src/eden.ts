import { treaty } from '@elysiajs/eden';
import type { App } from '../../api/src';

const client = treaty<App>('localhost:3000');

export const helloWorld = async () => {
  const response = await client.index.get();
  return response.data;
};

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

export const getLoggedInUser = async (sessionId: string) => {
  const res = await client.users.loggedin.get({
    headers: { authorization: `Bearer ${sessionId}` },
  });
  return res.data?.data;
};

export const logout = async (sessionId: string) => {
  return await client.users.logout.post({}, { headers: { authorization: `Bearer ${sessionId}` } });
};
