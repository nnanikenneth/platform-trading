import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "@src/users/users.service";
import { PrismaService } from "@src/database/prisma.service";
import { Role, User } from "@prisma/client";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

describe("UsersService", () => {
  let usersService: UsersService;
  let prismaMock: DeepMockProxy<PrismaService>;

  const mockUser: User = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    password: "password123",
    role: Role.BUYER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    avatarUrl: null,
  };

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe("findByEmail", () => {
    it("should return a user if found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByEmail("test@example.com");
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return null if no user is found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail("nonexistent@example.com");
      expect(result).toBeNull();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: "nonexistent@example.com" },
      });
    });
  });

  describe("create", () => {
    const createUserData = {
      email: "newuser@example.com",
      name: "New User",
      password: "password123",
      role: Role.SELLER,
    };

    it("should create a new user", async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await usersService.create(createUserData);
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: createUserData,
      });
    });
  });

  describe("findById", () => {
    it("should return a user by ID if found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findById("1");
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("should return null if no user is found by ID", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findById("nonexistentId");
      expect(result).toBeNull();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "nonexistentId" },
      });
    });
  });
});
