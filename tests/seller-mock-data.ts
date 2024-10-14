import { DealStatus, DiscountType, AuthorizationRequestStatus, AuthorizationLevel } from "@prisma/client";

// Mock Seller
export const mockSeller = {
  id: 'sellerId',
  userId: 'userId',
  apiKey: 'mock-api-key',
  publicAccess: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// Mock Buyer
export const mockBuyer = {
  id: 'buyerId',
  userId: 'buyerUserId',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  webhookUrl: 'https://mock-webhook-url.com',
};

// Mock Discount
export const mockDiscount = {
  id: 'discountId',
  type: DiscountType.FLAT,
  amount: 50,
};

// Mock Deal Item
export const mockDealItem = {
  id: 'itemId',
  name: 'Mock Item',
  price: 100,
  quantity: 2,
};

// Mock Deal
export const mockDeal = {
    id: 'dealId',
    name: 'New Deal', // Match the name to the expected input
    description: 'A brand new deal',
    sellerId: 'sellerId',
    totalPrice: 200,
    currency: 'USD',
    status: DealStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [
      {
        id: 'itemId1',
        name: 'Item 1',
        price: 100,
        quantity: 2,
      },
    ],
    discount: null, // If no discount is provided
    imageUrl: "https://example.com"
  };
  
  
  

// Mock Updated Deal for update tests
export const mockUpdatedDeal = {
    id: 'dealId',
    name: 'Updated Mock Deal',
    description: 'This is an updated mock deal.',
    sellerId: 'sellerId',
    totalPrice: 300,
    currency: 'USD',
    status: DealStatus.SOLD,  // Correct usage of DealStatus enum
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [
      { id: 'itemId', name: 'Updated Mock Item', price: 150, quantity: 3 },
    ],
    discount: {
      id: 'discountId',
      type: DiscountType.PERCENTAGE,  // Correct usage of DiscountType enum
      amount: 10,
    },
  };
  
  export const mockUpdatedDealNoDiscount = {
    id: 'dealId',
    name: 'Updated Mock Deal',
    description: 'This is an updated mock deal without discount.',
    sellerId: 'sellerId',
    totalPrice: 300,
    currency: 'USD',
    status: DealStatus.SOLD as DealStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    items: [
      { id: 'itemId', name: 'Updated Mock Item', price: 150, quantity: 3 },
    ],
    discount: null,
  };
  
  

// Mock Authorization Request
export const mockAuthorizationRequest = {
  id: 'requestId',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  status: AuthorizationRequestStatus.PENDING,
  message: 'Request for access',
  createdAt: new Date(),
  expiresAt: null,
  updatedAt: null,
};

// Mock Authorized Buyer-Seller Relationship
export const mockAuthorizedBuyerSeller = {
  id: 'relationId',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  authorizedUntil: null,
  authorizationLevel: AuthorizationLevel.FULL_ACCESS,
};






// // mock-data.ts

// import { DealStatus, AuthorizationRequestStatus, AuthorizationLevel, DiscountType } from "@prisma/client";

// // Mock Seller
// export const mockSeller = {
//   id: 'sellerId',
//   apiKey: 'seller-api-key',
//   publicAccess: true,
//   userId: 'userId',
//   createdAt: new Date(),
//   updatedAt: new Date(),
//   deletedAt: null,
// };

// // Mock Deal
// export const mockDeal = {
//     id: 'dealId',
//     name: 'Test Deal',
//     description: 'A test deal',
//     sellerId: 'sellerId',
//     totalPrice: 500,
//     currency: 'USD',
//     status: DealStatus.AVAILABLE,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     deletedAt: null, // Add this field
//     imageUrl: null, // Add this field
//     items: [
//       { id: 'item1', name: 'Item 1', price: 100, quantity: 5 },
//       { id: 'item2', name: 'Item 2', price: 200, quantity: 2 },
//     ],
//     discount: { id: 'discountId', type: DiscountType.FLAT, amount: 50 },
//   };
  
//   export const mockUpdatedDeal = {
//     ...mockDeal,
//     name: 'Updated Deal',
//     status: DealStatus.SOLD,
//     deletedAt: null, // Ensure these fields are included
//     imageUrl: 'http://example.com/deal-image.jpg', // Or a valid image URL
//   };
  
// // Mock Authorization Request
// export const mockAuthorizationRequest = {
//   id: 'requestId',
//   buyerId: 'buyerId',
//   sellerId: 'sellerId',
//   status: AuthorizationRequestStatus.PENDING,
//   message: 'Request to access seller deals',
//   createdAt: new Date(),
//   updatedAt: new Date(),
// };

// // Mock Updated Deal
// // export const mockUpdatedDeal = {
// //   ...mockDeal,
// //   name: 'Updated Deal',
// //   totalPrice: 600,
// //   status: DealStatus.SOLD,
// // };
