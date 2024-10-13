import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ConfigService } from "@nestjs/config";
import { RateLimiterService } from "@src/common/services/rate-limiter.service";
import { CustomLoggerService } from "@src/common/services/logger.service";
import { AuthService } from "@src/auth/auth.service";
import { User } from "@prisma/client";

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly authService: AuthService,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * Middleware to enforce rate limiting on API requests.
   * @param req - The incoming Fastify request object, extended with the authenticated user.
   * @param res - The Fastify response object used to send the response back to the client.
   * @param next - The next middleware function to call if the rate limit is not exceeded.
   */
  async use(
    req: FastifyRequest & { user: User },
    res: FastifyReply,
    next: () => void
  ) {
    const ip = req.ip;
    const routePath = req.originalUrl || req.url;
    const method = req.method;
    const userAgent = req.headers["user-agent"] || "";
    const statusCode = res.statusCode;

    let userId: string | null = null;

    const authorizationHeader = req.headers["authorization"];

    if (authorizationHeader) {
      const token = authorizationHeader.split(" ")[1];
      if (token) {
        try {
          const decodedUser = await this.authService.decodeToken(token);
          userId = decodedUser?.id || null;
        } catch (error) {
          this.logger.error(
            `Failed to decode token for rate limiting: ${error}`
          );
        }
      }
    }

    const globalRateLimit = this.configService.get<{
      max: number;
      timeWindow: string;
    }>("rateLimit.global");
    const routeRateLimits = this.configService.get<{
      [key: string]: { max: number; timeWindow: string };
    }>("rateLimit.routes");
    const routeConfig = routeRateLimits?.[routePath] || globalRateLimit;
    console.log(routeConfig, userId, routePath);

    if (!routeConfig) {
      this.logger.error(
        `Rate limit configuration is missing for both route and global for ${routePath}`
      );
      throw new HttpException(
        "Rate limit configuration not found",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      await this.rateLimiterService.isRateLimited(
        ip,
        routePath,
        userId,
        routeConfig.max,
        routeConfig.timeWindow,
        method,
        statusCode,
        userAgent
      );
      next();
    } catch (error) {
      res.header("Retry-After", "60").status(429).send({
        statusCode: 429,
        message: "Too many requests. Please try again later.",
      });
    }
  }
}
