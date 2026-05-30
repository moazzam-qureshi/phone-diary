import "server-only";

// Typed, validated access to server-side environment variables.
// Throws early (at first access) if a required variable is missing, so
// misconfiguration surfaces on boot rather than mid-request.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get SESSION_SECRET() {
    return required("SESSION_SECRET");
  },
  get APP_PASSWORD_HASH() {
    return required("APP_PASSWORD_HASH");
  },
  get OPENROUTER_API_KEY() {
    return required("OPENROUTER_API_KEY");
  },
  get OPENROUTER_BASE_URL() {
    return optional("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1");
  },
  get OPENROUTER_MODEL() {
    return optional("OPENROUTER_MODEL", "openai/gpt-4o-mini");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
