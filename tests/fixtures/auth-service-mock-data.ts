import { Role } from "@prisma/client";

export const mockUser = {
  id: "userId",
  email: "test@example.com",
  password: "hashedPassword",
  name: "Test User",
  role: Role.SELLER,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  avatarUrl: null,
};

export const mockSeller = {
  id: "sellerId",
  userId: "userId",
  apiKey: "api-key",
  publicAccess: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockBuyer = {
  id: "buyerId",
  userId: "userId",
  webhookUrl: "https://example.com",
  secretKey: "mock-secret-key",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};
