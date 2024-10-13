import { registerAs } from "@nestjs/config";

export default registerAs("general", () => ({
  appPort: process.env.APP_PORT || 3000,
  corsEnabled: process.env.CORS_ENABLED === "true" || true,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  logLevel: process.env.LOG_LEVEL || "info",
  apiVersion: process.env.API_VERSION || "v1",
  nodeEnv: process.env.NODE_ENV || "development",
  prismaLogging: process.env.PRISMA_LOGGING === "true",
  cookieSecret: process.env.COOKIE_SECRET || "defaultCookieSecret",
}));
