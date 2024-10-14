import {
  DealStatus,
  DiscountType,
  AuthorizationRequestStatus,
  AuthorizationLevel,
} from "@prisma/client";

export const mockSeller = {
  id: "sellerId",
  userId: "userId",
  apiKey: "mock-api-key",
  publicAccess: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockBuyer = {
  id: "buyerId",
  userId: "buyerUserId",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  webhookUrl: "https://mock-webhook-url.com",
  secretKey: "mock-secret-key",
};

export const mockDiscount = {
  id: "discountId",
  type: DiscountType.FLAT,
  amount: 50,
};

export const mockDealItem = {
  id: "itemId",
  name: "Mock Item",
  price: 100,
  quantity: 2,
};

export const mockDeal = {
  id: "dealId",
  name: "New Deal",
  description: "A brand new deal",
  sellerId: "sellerId",
  totalPrice: 200,
  currency: "USD",
  status: DealStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  items: [
    {
      id: "itemId1",
      name: "Item 1",
      price: 100,
      quantity: 2,
    },
  ],
  discount: null,
  imageUrl: "https://example.com",
};

export const mockUpdatedDeal = {
  id: "dealId",
  name: "Updated Mock Deal",
  description: "This is an updated mock deal.",
  sellerId: "sellerId",
  totalPrice: 300,
  currency: "USD",
  status: DealStatus.SOLD,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  items: [{ id: "itemId", name: "Updated Mock Item", price: 150, quantity: 3 }],
  discount: {
    id: "discountId",
    type: DiscountType.PERCENTAGE,
    amount: 10,
  },
};

export const mockUpdatedDealNoDiscount = {
  id: "dealId",
  name: "Updated Mock Deal",
  description: "This is an updated mock deal without discount.",
  sellerId: "sellerId",
  totalPrice: 300,
  currency: "USD",
  status: DealStatus.SOLD as DealStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  items: [{ id: "itemId", name: "Updated Mock Item", price: 150, quantity: 3 }],
  discount: null,
};

export const mockAuthorizationRequest = {
  id: "requestId",
  buyerId: "buyerId",
  sellerId: "sellerId",
  status: AuthorizationRequestStatus.PENDING,
  message: "Request for access",
  createdAt: new Date(),
  expiresAt: null,
  updatedAt: null,
};

export const mockAuthorizedBuyerSeller = {
  id: "relationId",
  buyerId: "buyerId",
  sellerId: "sellerId",
  authorizedUntil: null,
  authorizationLevel: AuthorizationLevel.FULL_ACCESS,
};
