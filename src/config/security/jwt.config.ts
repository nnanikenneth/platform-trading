import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET || "defaultSecret",
  expiresIn: process.env.JWT_EXPIRATION || "3600",
  issuer: process.env.JWT_ISSUER || "defaultIssuer",
  audience: process.env.JWT_AUDIENCE || "defaultAudience",
}));
