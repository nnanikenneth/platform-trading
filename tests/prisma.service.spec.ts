import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../src/database/prisma.service";
import { INestApplication, Logger } from "@nestjs/common";

describe("PrismaService", () => {
  let prismaService: PrismaService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useFactory: () =>
            new PrismaService("postgresql://localhost:5432/mydb"),
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);

    loggerSpy = jest.spyOn(Logger.prototype, "log");
    jest.spyOn(prismaService, "$connect").mockResolvedValue(undefined);
    jest.spyOn(prismaService, "$disconnect").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should successfully connect to the database and log success", async () => {
      await prismaService.onModuleInit();

      expect(prismaService.$connect).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        "Prisma is connecting to the database..."
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        "Prisma successfully connected to the database."
      );
    });

    it("should log and throw an error if the database connection fails", async () => {
      const mockError = new Error("Connection failed");
      jest.spyOn(prismaService, "$connect").mockRejectedValue(mockError);
      const errorSpy = jest.spyOn(Logger.prototype, "error");

      await expect(prismaService.onModuleInit()).rejects.toThrow(
        "Database connection failed"
      );
      expect(errorSpy).toHaveBeenCalledWith(
        "Prisma failed to connect to the database",
        mockError
      );
    });
  });

  describe("onModuleDestroy", () => {
    it("should successfully disconnect from the database and log success", async () => {
      await prismaService.onModuleDestroy();

      expect(prismaService.$disconnect).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        "Prisma is disconnecting from the database..."
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        "Prisma successfully disconnected from the database."
      );
    });

    it("should log and throw an error if the database disconnection fails", async () => {
      const mockError = new Error("Disconnection failed");
      jest.spyOn(prismaService, "$disconnect").mockRejectedValue(mockError);
      const errorSpy = jest.spyOn(Logger.prototype, "error");

      await expect(prismaService.onModuleDestroy()).rejects.toThrow(
        "Failed to disconnect from the database"
      );

      expect(errorSpy).toHaveBeenCalledWith(
        "Prisma failed to disconnect from the database",
        mockError
      );
    });
  });

  describe("enableShutdownHooks", () => {
    it("should call app.close() when beforeExit is triggered", async () => {
      const mockApp = { close: jest.fn() } as unknown as INestApplication;
      jest.spyOn(prismaService, "$on").mockImplementation((event, callback) => {
        if (event === "beforeExit") {
          callback({} as any);
        }
      });

      await prismaService.enableShutdownHooks(mockApp);

      expect(prismaService.$on).toHaveBeenCalledWith(
        "beforeExit",
        expect.any(Function)
      );
      expect(mockApp.close).toHaveBeenCalled();
    });
  });
});
