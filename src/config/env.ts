import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 *
 * Fails fast at boot (with a readable error) instead of surfacing cryptic
 * `undefined` bugs deep inside the request lifecycle.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32, "must be at least 32 characters"),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(32, "must be at least 32 characters"),
  AUTH_ACCESS_TOKEN_TTL: z.string().default("15m"),
  AUTH_REFRESH_TOKEN_TTL: z.string().default("30d"),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration.\n${issues}\n\nSee .env.example for the required variables.`,
    );
  }

  return parsed.data;
}

let cached: Env | undefined;

/** Lazily validates and caches `process.env`. Safe to call from any runtime. */
export function getEnv(): Env {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}

export const isProduction = () => getEnv().NODE_ENV === "production";
export const isTest = () => getEnv().NODE_ENV === "test";
