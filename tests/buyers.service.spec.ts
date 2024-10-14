import { Test, TestingModule } from "@nestjs/testing";
import { BuyersService } from "../src/buyers/buyers.service";
import { PrismaService } from "../src/database/prisma.service";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  mockBuyer,
  mockSeller,
  mockPublicDeal,
  mockAuthorizedDeals,
  mockAuthorizationRequest,
} from "./fixtures/buyer-service-mock-data";
import { AuthorizationLevel } from "@prisma/client";

describe("BuyersService", () => {
  let buyersService: BuyersService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    buyersService = module.get<BuyersService>(BuyersService);
  });

  describe("findBuyerByUserId", () => {
    it("should return a buyer when found", async () => {
      prismaMock.buyer.findUnique.mockResolvedValue(mockBuyer);

      const result = await buyersService.findBuyerByUserId("userId");
      expect(result).toEqual(mockBuyer);
      expect(prismaMock.buyer.findUnique).toHaveBeenCalledWith({
        where: { userId: "userId" },
      });
    });

    it("should throw NotFoundException if buyer is not found", async () => {
      prismaMock.buyer.findUnique.mockResolvedValue(null);

      await expect(buyersService.findBuyerByUserId("userId")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("getAllDeals", () => {
    it("should return a list of authorized and public deals", async () => {
      prismaMock.deal.findMany.mockResolvedValue([mockPublicDeal]);
      prismaMock.buyerSeller.findMany.mockResolvedValue([mockAuthorizedDeals]);

      const result = await buyersService.getAllDeals("buyerId");
      expect(result.deals).toHaveLength(2);
      expect(prismaMock.deal.findMany).toHaveBeenCalled();
      expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
    });
  });

  describe("requestAccess", () => {
    it("should successfully send an access request", async () => {
      prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
      prismaMock.buyer.findUnique.mockResolvedValue(mockBuyer);
      prismaMock.authorizationRequest.findFirst.mockResolvedValue(null);
      prismaMock.authorizationRequest.create.mockResolvedValue(
        mockAuthorizationRequest
      );

      const result = await buyersService.requestAccess(
        "buyerId",
        "sellerId",
        "Request message"
      );
      expect(result.message).toEqual("Access request sent successfully.");
      expect(prismaMock.authorizationRequest.create).toHaveBeenCalledWith({
        data: {
          buyerId: "buyerId",
          sellerId: "sellerId",
          status: mockAuthorizationRequest.status,
          message: "Request message",
        },
      });
    });

    it("should throw BadRequestException if an access request already exists", async () => {
      prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
      prismaMock.buyer.findUnique.mockResolvedValue(mockBuyer);
      prismaMock.authorizationRequest.findFirst.mockResolvedValue(
        mockAuthorizationRequest
      );

      await expect(
        buyersService.requestAccess("buyerId", "sellerId", "Request message")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setWebhook", () => {
    it("should successfully set a valid webhook URL for the buyer", async () => {
      prismaMock.buyer.update.mockResolvedValue({
        ...mockBuyer,
        webhookUrl: "https://valid-webhook.com",
      });

      const result = await buyersService.setWebhook(
        "buyerId",
        "https://valid-webhook.com"
      );
      expect(result.message).toEqual("Webhook URL updated successfully.");
      expect(result.buyer.webhookUrl).toEqual("https://valid-webhook.com");
      expect(prismaMock.buyer.update).toHaveBeenCalledWith({
        where: { id: "buyerId" },
        data: { webhookUrl: "https://valid-webhook.com" },
        include: { user: true },
      });
    });

    it("should throw BadRequestException for invalid webhook URL", async () => {
      await expect(
        buyersService.setWebhook("buyerId", "invalid-url")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findBuyerByUserId Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      prismaMock.buyer.findUnique.mockRejectedValue(
        new Error("Unexpected Error")
      );

      await expect(buyersService.findBuyerByUserId("userId")).rejects.toThrow(
        InternalServerErrorException
      );
      expect(prismaMock.buyer.findUnique).toHaveBeenCalled();
    });
  });

  describe("getAuthorizedPrivateDeals with No Deals", () => {
    it("should throw NotFoundException when no authorized private deals are found", async () => {
      prismaMock.buyerSeller.findMany.mockResolvedValue([]);

      await expect(
        buyersService.getAuthorizedPrivateDeals("buyerId")
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
    });
  });

  describe("requestAccess Error Handling", () => {
    it("should handle unexpected errors during request creation", async () => {
      prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
      prismaMock.buyer.findUnique.mockResolvedValue(mockBuyer);
      prismaMock.authorizationRequest.findFirst.mockResolvedValue(null);
      prismaMock.authorizationRequest.create.mockRejectedValue(
        new Error("Unexpected Error")
      );

      await expect(
        buyersService.requestAccess("buyerId", "sellerId", "Request message")
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("getDealsForSpecificSeller with Public Access", () => {
    it("should return public deals for a seller", async () => {
      prismaMock.buyerSeller.findFirst.mockResolvedValue(null);

      prismaMock.seller.findUnique.mockResolvedValue({
        id: "sellerId",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        userId: "userId",
        apiKey: "apiKey",
        publicAccess: true,
      });

      prismaMock.deal.findMany.mockResolvedValue([mockPublicDeal]);

      const result = await buyersService.getDealsForSpecificSeller(
        "buyerId",
        "sellerId"
      );
      expect(result.deals).toHaveLength(1);
      expect(result.deals[0].name).toEqual(mockPublicDeal.name);
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith({
        where: { sellerId: "sellerId", status: "AVAILABLE" },
        select: expect.any(Object),
      });
    });

    it("should throw BadRequestException if the buyer is not authorized to view private deals and seller is not public", async () => {
      prismaMock.buyerSeller.findFirst.mockResolvedValue(null);
      prismaMock.seller.findUnique.mockResolvedValue({
        id: "sellerId",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        userId: "userId",
        apiKey: "apiKey",
        publicAccess: false,
      });

      await expect(
        buyersService.getDealsForSpecificSeller("buyerId", "sellerId")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setWebhook Buyer Not Found", () => {
    it("should throw NotFoundException when buyer is not found", async () => {
      prismaMock.buyer.update.mockRejectedValue(
        new NotFoundException("Buyer not found")
      );

      await expect(
        buyersService.setWebhook(
          "nonExistentBuyerId",
          "https://valid-webhook.com"
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllDeals Error Handling", () => {
    it("should handle unexpected errors during deal retrieval", async () => {
      prismaMock.deal.findMany.mockRejectedValue(new Error("Unexpected Error"));

      await expect(buyersService.getAllDeals("buyerId")).rejects.toThrow(
        InternalServerErrorException
      );
      expect(prismaMock.deal.findMany).toHaveBeenCalled();
    });
  });

  describe("getDealsForSpecificSeller No Deals Found", () => {
    it("should throw NotFoundException when no deals are found for the seller", async () => {
      prismaMock.buyerSeller.findFirst.mockResolvedValue({
        id: "relationId",
        buyerId: "buyerId",
        sellerId: "sellerId",
        authorizedUntil: null,
        authorizationLevel: AuthorizationLevel.FULL_ACCESS,
      });

      prismaMock.deal.findMany.mockResolvedValue([]);

      await expect(
        buyersService.getDealsForSpecificSeller("buyerId", "sellerId")
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("should return only public deals when no authorized deals exist", async () => {
    prismaMock.deal.findMany.mockResolvedValue([mockPublicDeal]);
    prismaMock.buyerSeller.findMany.mockResolvedValue([]);

    const result = await buyersService.getAllDeals("buyerId");
    expect(result.deals).toHaveLength(1);
    expect(result.deals[0].name).toEqual(mockPublicDeal.name);
    expect(prismaMock.deal.findMany).toHaveBeenCalled();
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
  });

  it("should return authorized deals along with public deals", async () => {
    prismaMock.deal.findMany.mockResolvedValue([mockPublicDeal]);
    prismaMock.buyerSeller.findMany.mockResolvedValue([mockAuthorizedDeals]);

    const result = await buyersService.getAllDeals("buyerId");
    expect(result.deals).toHaveLength(2);
    expect(result.deals[0].name).toEqual(mockPublicDeal.name);
    expect(result.deals[1].name).toEqual(
      mockAuthorizedDeals.seller.deals[0].name
    );
    expect(prismaMock.deal.findMany).toHaveBeenCalled();
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
  });

  it("should return an empty list if no deals exist", async () => {
    prismaMock.deal.findMany.mockResolvedValue([]);
    prismaMock.buyerSeller.findMany.mockResolvedValue([]);

    const result = await buyersService.getAllDeals("buyerId");
    expect(result.deals).toHaveLength(0);
    expect(prismaMock.deal.findMany).toHaveBeenCalled();
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
  });

  it("should throw InternalServerErrorException if an unexpected error occurs", async () => {
    prismaMock.deal.findMany.mockRejectedValue(new Error("Unexpected Error"));

    await expect(buyersService.getAllDeals("buyerId")).rejects.toThrow(
      InternalServerErrorException
    );
    expect(prismaMock.deal.findMany).toHaveBeenCalled();
  });

  it("should return authorized private deals when available", async () => {
    prismaMock.buyerSeller.findMany.mockResolvedValue([mockAuthorizedDeals]);

    const result = await buyersService.getAuthorizedPrivateDeals("buyerId");
    expect(result.privateDeals).toHaveLength(1);
    expect(result.privateDeals[0].name).toEqual(
      mockAuthorizedDeals.seller.deals[0].name
    );
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalledWith({
      where: { buyerId: "buyerId" },
      include: {
        seller: {
          include: {
            deals: expect.any(Object),
          },
        },
      },
    });
  });

  it("should return an empty list when there are no authorized private deals", async () => {
    prismaMock.buyerSeller.findMany.mockResolvedValue([]);

    await expect(
      buyersService.getAuthorizedPrivateDeals("buyerId")
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
  });

  it("should throw InternalServerErrorException if an unexpected error occurs", async () => {
    prismaMock.buyerSeller.findMany.mockRejectedValue(
      new Error("Unexpected Error")
    );

    await expect(
      buyersService.getAuthorizedPrivateDeals("buyerId")
    ).rejects.toThrow(InternalServerErrorException);
    expect(prismaMock.buyerSeller.findMany).toHaveBeenCalled();
  });

  it("should return only public deals when no authorized private deals are available", async () => {
    prismaMock.deal.findMany.mockResolvedValue([mockPublicDeal]);
    prismaMock.buyerSeller.findMany.mockResolvedValue([]);

    const result = await buyersService.getAllDeals("buyerId");
    expect(result.deals).toHaveLength(1);
    expect(result.deals[0].name).toEqual(mockPublicDeal.name);
  });

  it("should handle a large number of public and authorized deals", async () => {
    const largeMockPublicDeals = Array(1000).fill(mockPublicDeal);
    const largeMockAuthorizedDeals = Array(1000).fill(mockAuthorizedDeals);

    prismaMock.deal.findMany.mockResolvedValue(largeMockPublicDeals);
    prismaMock.buyerSeller.findMany.mockResolvedValue(largeMockAuthorizedDeals);

    const result = await buyersService.getAllDeals("buyerId");
    expect(result.deals).toHaveLength(2000);
  });
});
