import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import redisConfig from "./database/redis.config";
import rateLimitConfig from "./security/ratelimit.config";
import jwtConfig from "./security/jwt.config";
import { validationSchema } from "./config-validation.schema";
import webhookConfig from "./webhook.config";
import databaseConfig from "./database/database.config";
import configGeneral from "./config.general";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
      load: [
        redisConfig,
        rateLimitConfig,
        configGeneral,
        webhookConfig,
        jwtConfig,
        databaseConfig,
      ],
      validationSchema,
    }),
  ],
})
export class AppConfigurationModule {}
