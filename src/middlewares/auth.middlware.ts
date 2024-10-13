import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService, TokenExpiredError, JsonWebTokenError } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { IncomingMessage, ServerResponse } from "http";
import { UsersService } from "@src/users/users.service";
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  async use(
    req: IncomingMessage & { user?: User },
    res: ServerResponse,
    next: () => void
  ) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !this.isValidAuthHeader(authHeader)) {
      return this.sendErrorResponse(
        res,
        401,
        "Authorization header is missing or malformed."
      );
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = this.jwtService.verify<{ sub: string }>(token);
      const user = this.usersService.findById(decoded.sub);

      if (!user) {
        return this.sendErrorResponse(
          res,
          401,
          "No user found associated with the provided token."
        );
      }

      (req as any).user = user;
      next();
    } catch (error) {
      this.handleJwtError(res, error);
    }
  }

  private isValidAuthHeader(authHeader?: string): boolean {
    return !!(authHeader && authHeader.startsWith("Bearer "));
  }

  private handleJwtError(res: ServerResponse, error: unknown) {
    if (error instanceof TokenExpiredError) {
      return this.sendErrorResponse(res, 401, "Token has expired.");
    } else if (error instanceof JsonWebTokenError) {
      return this.sendErrorResponse(res, 401, "The provided token is invalid.");
    }
    return this.sendErrorResponse(res, 401, "Unauthorized access.");
  }

  private sendErrorResponse(
    res: ServerResponse,
    statusCode: number,
    message: string
  ) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ statusCode, message }));
  }
}
