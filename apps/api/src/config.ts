import { z } from 'zod';

const configSchema = z.object({
  /** Port number the server will listen on */
  PORT: z.number().default(3000),

  /** Current environment the application is running in */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /** Application URL */
  APP_URL: z.string().url(),

  /** DATABASE URL  */
  DATABASE_URL: z.string().url(),

  /** Google OAuth client ID */
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),

  /** Google OAuth client secret */
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),

  /** Google OAuth redirect URI */
  GOOGLE_REDIRECT_URI: z.string().url(),

  /** Frontend URL */
  FRONTEND_URL: z.string().url(),

  /** OpenTelemetry OTLP endpoint */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url(),

  /** OpenTelemetry OTLP API key */
  OTEL_EXPORTER_OTLP_API_KEY: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;

function validateEnvConfig(env: NodeJS.ProcessEnv): Config {
  const result = configSchema.safeParse({
    PORT: env.PORT ? parseInt(env.PORT) : undefined,
    NODE_ENV: env.NODE_ENV,
    APP_URL: env.APP_URL,
    GOOGLE_OAUTH_CLIENT_ID: env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
    FRONTEND_URL: env.FRONTEND_URL,
    DATABASE_URL: env.DATABASE_URL,
    OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_API_KEY: env.OTEL_EXPORTER_OTLP_API_KEY,
  });

  if (!result.success) {
    console.error('❌ Invalid ENV configuration:', result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = validateEnvConfig(process.env);
