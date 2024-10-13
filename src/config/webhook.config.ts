import { registerAs } from "@nestjs/config";

export default registerAs("webhook", () => ({
  retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || "5", 10),
  backoffType: process.env.WEBHOOK_BACKOFF_TYPE || "fixed",
  backoffDelay: parseInt(process.env.WEBHOOK_BACKOFF_DELAY || "60000", 10),
}));
