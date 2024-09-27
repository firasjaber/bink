import { Elysia } from 'elysia';
import { users } from './user/route';
import cors from '@elysiajs/cors';
import { initDrizzle } from 'db';
import { links } from './link/route';

export const drizzle = await initDrizzle();
console.log('🐘 Database connected');

const app = new Elysia().use(cors()).use(users).use(links).listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
