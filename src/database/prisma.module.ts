import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ConfigService } from "@nestjs/config";

@Global()
@Module({})
export class PrismaModule {
  // initialization with a static database URL
  static forRoot(databaseUrl: string): DynamicModule {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be provided");
    }

    return {
      module: PrismaModule,
      providers: [
        {
          provide: PrismaService,
          useFactory: () => new PrismaService(databaseUrl),
        },
      ],
      exports: [PrismaService],
    };
  }

  /**
   * Initializes the PrismaModule with a static database URL.
   * @param databaseUrl - The database URL to be used by PrismaService.
   * @returns A DynamicModule with PrismaService configured to use the provided database URL.
   * @throws Error if the database URL is not provided.
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<string> | string;
    inject?: any[];
  }): DynamicModule {
    return {
      module: PrismaModule,
      providers: [
        PrismaService,
        {
          provide: PrismaService,
          useFactory: async (...args: any[]) => {
            const databaseUrl = await options.useFactory(...args);
            if (!databaseUrl) {
              throw new Error("DATABASE_URL is not defined.");
            }
            return new PrismaService(databaseUrl);
          },
          inject: options.inject || [],
        },
      ],
      exports: [PrismaService],
    };
  }

  /**
   * Initializes PrismaModule using the NestJS ConfigService to retrieve the database URL.
   * @throws Error if the database URL is not defined in the environment configuration.
   */
  static forRootWithConfig(): DynamicModule {
    return {
      module: PrismaModule,
      providers: [
        {
          provide: "DATABASE_URL",
          useFactory: (configService: ConfigService) => {
            const databaseUrl = configService.get<string>("database.url");
            console.log(`Fetched DATABASE_URL: ${databaseUrl}`);
            if (!databaseUrl) {
              throw new Error("DATABASE_URL is not defined in the environment");
            }
            return databaseUrl;
          },
          inject: [ConfigService],
        },
        {
          provide: PrismaService,
          useFactory: (databaseUrl: string) => new PrismaService(databaseUrl),
          inject: ["DATABASE_URL"],
        },
      ],
      exports: [PrismaService],
    };
  }

  /**
   * Initializes PrismaModule for a multi-tenant setup, allowing each tenant to have its own PrismaService.
   * @returns A DynamicModule with separate PrismaService instances for each tenant.
   */
  static forMultiTenancy(options: {
    tenants: string[];
    useFactory: (tenantId: string, ...args: any[]) => Promise<string> | string;
    inject?: any[];
  }): DynamicModule {
    const tenantProviders: Provider[] = options.tenants.map(
      (tenantId) =>
        ({
          provide: `${tenantId}_PRISMA_SERVICE`,
          useFactory: async (...args: any[]) => {
            const databaseUrl = await options.useFactory(tenantId, ...args);
            if (!databaseUrl) {
              throw new Error(
                `DATABASE_URL is not defined for tenant: ${tenantId}`
              );
            }
            return new PrismaService(databaseUrl);
          },
          inject: options.inject || [],
        } as Provider)
    );

    return {
      module: PrismaModule,
      providers: [...tenantProviders],
      exports: tenantProviders.map((provider) => (provider as any).provide),
    };
  }
}
