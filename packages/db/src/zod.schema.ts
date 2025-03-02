import { createInsertSchema } from 'drizzle-zod';
import { linkTable } from './schema';

// link table zod input type
export const insertLinkSchema = createInsertSchema(linkTable);
