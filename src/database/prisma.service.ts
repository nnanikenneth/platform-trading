import { PrismaClient, Prisma } from "@prisma/client";
import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, "beforeExit">
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(databaseUrl: string) {
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    this.logger.log(`Prisma is using DATABASE_URL: ${databaseUrl}`);
  }

  async onModuleInit() {
    try {
      this.logger.log("Prisma is connecting to the database...");
      await this.$connect();
      this.logger.log("Prisma successfully connected to the database.");
    } catch (error) {
      this.logger.error("Prisma failed to connect to the database", error);
      throw new Error("Database connection failed");
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log("Prisma is disconnecting from the database...");
      await this.$disconnect();
      this.logger.log("Prisma successfully disconnected from the database.");
    } catch (error) {
      this.logger.error("Prisma failed to disconnect from the database", error);
      throw new Error("Failed to disconnect from the database");
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit", async () => {
      await app.close();
    });
  }
}
