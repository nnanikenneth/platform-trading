import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CustomLoggerService } from '@common/services/logger.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly logger: CustomLoggerService) {}

  /**
   * Checks if the user has the required roles to access the route.
   * It retrieves the roles from the metadata (using the @Roles decorator) and compares them with the user's role.
   * @returns boolean indicating if the user has the required roles.
   * @throws ForbiddenException if the user doesn't have the required role.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.log(`No roles required for this route`);
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.error(`User not found in request`);
      throw new ForbiddenException('Access Denied: User not authenticated');
    }

    this.logger.log(`User Role: ${user.role}, Required Roles: ${requiredRoles.join(', ')}`);

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.error(`User with role ${user.role} is not authorized to access this route`);
      throw new ForbiddenException('Access Denied: Insufficient permissions');
    }

    return true;
  }
}
