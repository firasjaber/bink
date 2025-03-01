import { z } from "zod";

const configSchema = z.object({
  /** Current environment the application is running in */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /** DATABASE URL  */
  DATABASE_URL: z.string().url(),
});

export type Config = z.infer<typeof configSchema>;

function validateEnvConfig(env: NodeJS.ProcessEnv): Config {
  const result = configSchema.safeParse({
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
  });

  if (!result.success) {
    console.error("❌ Invalid ENV configuration:", result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = validateEnvConfig(process.env);
