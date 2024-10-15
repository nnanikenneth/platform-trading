import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "@auth/auth.module";
import Redis from "ioredis";
import { PrismaModule } from "./database/prisma.module";
import { AllExceptionsFilter } from "@common/filters/all-exceptions.filter";
import { CustomLoggerService } from "@common/services/logger.service";
import { BullModule } from "@nestjs/bull";
import { AppConfigurationModule } from "@config/app-configuration.module";
import { RateLimiterMiddleware } from "./middlewares/rate-limiter.middleware";
import { BuyersModule } from "./buyers/buyers.module";
import { SellersModule } from "./sellers/sellers.module";
import { RateLimiterService } from "@common/services/rate-limiter.service";
import { WebhookService } from "@webhooks/webhook.service";
import { UsersService } from "@users/users.service";
import { WebhookModule } from "./webhooks/webhook.module";
import { AuthMiddleware } from "./middlewares/auth.middlware";
import { APP_FILTER } from "@nestjs/core";
import { TestController } from "./testcontroller";
// Uncomment to enable request / response logging
// import { LoggingInterceptor } from "./middlewares/logging.interceptor";
// import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

@Module({
  imports: [
    AppConfigurationModule,
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.db", 0),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          attempts: 3,
          backoff: 5000,
        },
      }),
      inject: [ConfigService],
    }),

    PrismaModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("database.url");
        if (!databaseUrl) {
          console.error("Error: DATABASE_URL is not defined.");
          throw new Error(
            "DATABASE_URL is not defined in the environment variables."
          );
        }
        console.log("Fetched DATABASE_URL from ConfigService:", databaseUrl);
        return databaseUrl;
      },
      inject: [ConfigService],
    }),

    PrismaModule,
    AuthModule,
    BuyersModule,
    SellersModule,
    WebhookModule,
  ],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: async (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.db", 0),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: "RedisService",
      useExisting: "REDIS_CLIENT",
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Uncomment if you want to enable request-response logging
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
    {
      provide: "RedisService",
      useFactory: (redisClient: Redis) => redisClient,
      inject: ["REDIS_CLIENT"],
    },
    RateLimiterService,
    UsersService,
    CustomLoggerService,
    WebhookService,
  ],
  controllers: [TestController],
  exports: ["REDIS_CLIENT", RateLimiterService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        // Register and login routes are entry points into our application
        { path: "auth/register", method: RequestMethod.POST },
        { path: "auth/login", method: RequestMethod.POST }
      )
      .forRoutes({ path: "*", method: RequestMethod.ALL });

    // We apply ratelimiting globally and then read from the 
    // config to specify specific configuration values for individual routes
    // We read rate limiting values from config for security reasons
    consumer.apply(RateLimiterMiddleware).forRoutes("*");
  }
}
