import { User } from "@prisma/client";
import { Buyer } from "@prisma/client";
import { Seller } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}
