import { FastifyRequest } from 'fastify';
import { Role } from '@prisma/client';
import { RolesMiddleware } from './roles.middleware';
import { User } from '@prisma/client';

export const createRolesMiddleware = (roles: Role[]) => {
  return (req: FastifyRequest & { user: User }, next: () => void) => {
    const middleware = new RolesMiddleware(roles);
    middleware.use(req, next);
  };
};
