import { Injectable, NestMiddleware, ForbiddenException } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { User, Role } from "@prisma/client";

@Injectable()
export class RolesMiddleware implements NestMiddleware {
  constructor(private readonly requiredRoles: Role[]) {}

  use(req: FastifyRequest & { user: User }, next: () => void) {
    const user = req.user as User;

    if (!user || !this.requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Access Denied");
    }

    next();
  }
}

export const createRolesMiddleware = (roles: Role[]) => {
  return new RolesMiddleware(roles).use.bind(new RolesMiddleware(roles));
};
