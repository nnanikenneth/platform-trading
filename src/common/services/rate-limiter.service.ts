import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "@src/database/prisma.service";
import { CustomLoggerService } from "./logger.service";

@Injectable()
export class RateLimiterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService
  ) {}

  async isRateLimited(
    ip: string,
    route: string,
    userId: string | null,
    limit: number,
    timeWindow: string,
    method: string,
    statusCode: number,
    userAgent: string
  ): Promise<void> {
    const timeWindowMs = this.parseTimeWindow(timeWindow);
    const currentTime = new Date();

    const lastRequestLog = await this.prisma.apiRequestLog.findFirst({
      where: {
        OR: [{ ipAddress: ip }, { userId: userId || undefined }],
        route,
        lastRequest: {
          gte: new Date(currentTime.getTime() - timeWindowMs),
        },
      },
    });

    if (lastRequestLog) {
      if (lastRequestLog.requestCount >= limit) {
        this.logger.error(`Rate limit exceeded for ${route} by IP: ${ip}`);
        throw new HttpException(
          "Too many requests",
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      await this.prisma.apiRequestLog.update({
        where: { id: lastRequestLog.id },
        data: {
          requestCount: { increment: 1 },
          lastRequest: currentTime,
        },
      });
    } else {
      await this.prisma.apiRequestLog.create({
        data: {
          userId: userId || null,
          endpoint: route,
          method: method,
          statusCode: statusCode,
          ipAddress: ip,
          userAgent: userAgent,
          requestCount: 1,
          route,
          lastRequest: currentTime,
        },
      });
    }
  }

  private parseTimeWindow(timeWindow: string): number {
    const [value, unit] = timeWindow.split(" ");
    switch (unit) {
      case "minute":
        return +value * 60 * 1000;
      case "hour":
        return +value * 60 * 60 * 1000;
      case "day":
        return +value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }
}
