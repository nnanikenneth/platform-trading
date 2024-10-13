import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { CustomLoggerService } from "@common/services/logger.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private reflector: Reflector,
    private readonly logger: CustomLoggerService
  ) {
    super();
  }

  /**
   * Override the `canActivate` method to add custom logic for JWT token validation.
   * @param context The execution context that provides access to the request and handler.
   * @returns A boolean indicating whether the request should proceed.
   */
  canActivate(context: ExecutionContext) {
    this.logger.log("Attempting to authenticate request");

    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log("Public route accessed, no authentication required");
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Override the `handleRequest` method to handle exceptions and customize error messages.
   * @returns The user object if authentication is successful.
   * @throws UnauthorizedException if authentication fails.
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error("Unauthorized access attempt", err || info);

      if (info && info.name === "TokenExpiredError") {
        throw new UnauthorizedException(
          "Token has expired, please log in again."
        );
      }

      throw err || new UnauthorizedException("Authentication failed");
    }

    this.logger.log(`User ${user.id} authenticated successfully`);

    return user;
  }
}
