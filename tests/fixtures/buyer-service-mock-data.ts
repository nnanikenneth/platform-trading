import {
  DealStatus,
  AuthorizationRequestStatus,
  AuthorizationLevel,
  Deal,
} from "@prisma/client";

export const mockBuyer = {
  id: "buyerId",
  userId: "userId",
  webhookUrl: null,
  secretKey: "sddd",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockSeller = {
  id: "sellerId",
  publicAccess: false,
  userId: "userId",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  apiKey: "apiKey",
};

export const mockAuthorizationRequest = {
  id: "requestId",
  buyerId: "buyerId",
  sellerId: "sellerId",
  status: AuthorizationRequestStatus.PENDING,
  message: "Request message",
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: null,
};

export const mockPublicDeal = {
  id: "publicDealId",
  name: "Public Deal",
  sellerId: "sellerId1",
  totalPrice: 100,
  currency: "USD",
  status: DealStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  description: "Public deal description",
  imageUrl: null,
  items: [{ id: "itemId1", name: "Item 1", price: 50, quantity: 2 }],
};

export const mockPrivateDeal = {
  id: "privateDealId",
  name: "Private Deal",
  sellerId: "sellerId2",
  totalPrice: 200,
  currency: "EUR",
  status: DealStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  description: "Private deal description",
  imageUrl: null,
  items: [{ id: "itemId2", name: "Item 2", price: 100, quantity: 1 }],
};

export const mockAuthorizedDeals = {
  buyerId: "buyerId",
  id: "relationId",
  sellerId: "sellerId2",
  authorizedUntil: null,
  authorizationLevel: AuthorizationLevel.FULL_ACCESS,
  seller: {
    deals: [mockPrivateDeal],
  },
};
