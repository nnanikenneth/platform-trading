import { registerAs } from "@nestjs/config";

export default registerAs("rateLimit", () => ({
  global: {
    max: 100,
    timeWindow: "1 minute",
  },
  routes: {
    "/auth/profile": {
      max: 3,
      timeWindow: "1 minute",
    },
    "/auth/register": {
      max: 5,
      timeWindow: "1 minute",
    },
  } as { [key: string]: { max: number; timeWindow: string } },
}));
