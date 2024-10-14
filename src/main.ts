import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "@common/filters/all-exceptions.filter";
import { ConfigService } from "@nestjs/config";
import { CustomLoggerService } from "@common/services/logger.service";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import compression from "compression";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("general.appPort") || 3000;

  const logger = app.get(CustomLoggerService);

  app.useGlobalFilters(new AllExceptionsFilter(logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  console.log(configService.get);

  const corsEnabled = configService.get<boolean>("CORS_ENABLED") || true;
  if (corsEnabled) {
    app.enableCors({
      origin: configService.get<string>("general.corsEnabled") || "*",
      methods: "GET,POST,PUT,DELETE",
      credentials: true,
    });
    logger.log("CORS is enabled");
  }

  app.use(helmet());

  app.use(compression());

  // Enable to set api versioning
  // app.setGlobalPrefix('api/v1');

  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
  logger.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();
