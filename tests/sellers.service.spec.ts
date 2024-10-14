import { Test, TestingModule } from "@nestjs/testing";
import { SellersService } from "../src/sellers/sellers.service";
import { PrismaService } from "../src/database/prisma.service";
import { WebhookService } from "../src/webhooks/webhook.service";
import { mockDeep, DeepMockProxy } from "jest-mock-extended";
import { CreateDealDto } from "../src/sellers/dto/create-deal.dto";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DealStatus } from "@prisma/client";
import {
  mockSeller,
  mockDeal,
  mockUpdatedDeal,
} from "./fixtures/seller-service-mock-data";
import { UpdateDealDto } from "@src/sellers/dto/update-deal.dto";

describe("SellersService - Create Deal", () => {
  let sellersService: SellersService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let webhookServiceMock: DeepMockProxy<WebhookService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    webhookServiceMock = mockDeep<WebhookService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: WebhookService, useValue: webhookServiceMock },
      ],
    }).compile();

    sellersService = module.get<SellersService>(SellersService);
  });

  const createDealDto: CreateDealDto = {
    name: "New Deal",
    description: "A brand new deal",
    currency: "USD",
    items: [{ name: "Item 1", price: 100, quantity: 2 }],
  };

  it("should successfully create a deal and send alerts", async () => {
    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
    prismaMock.$transaction.mockResolvedValue(mockDeal);

    const result = await sellersService.createNewDeal(
      "sellerId",
      createDealDto
    );

    expect(result.message).toEqual("Deal created successfully");
    expect(result.deal.name).toEqual(createDealDto.name);
    expect(result.deal.total_price).toEqual(
      createDealDto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    );
    expect(prismaMock.seller.findUnique).toHaveBeenCalledWith({
      where: { id: "sellerId" },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("should handle very large price and quantity values", async () => {
    const largeDealDto: CreateDealDto = {
      name: "Large Deal",
      description: "Deal with large values",
      currency: "USD",
      items: [
        {
          name: "Expensive Item",
          price: Number.MAX_SAFE_INTEGER,
          quantity: Number.MAX_SAFE_INTEGER,
        },
      ],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
    prismaMock.$transaction.mockResolvedValue({
      ...mockDeal,
      totalPrice: Number.MAX_SAFE_INTEGER * Number.MAX_SAFE_INTEGER,
    });

    const result = await sellersService.createNewDeal("sellerId", largeDealDto);

    expect(result.deal.total_price).toEqual(
      Number.MAX_SAFE_INTEGER * Number.MAX_SAFE_INTEGER
    );
  });

  it("should throw BadRequestException for unsupported currency", async () => {
    const createDealDto: CreateDealDto = {
      name: "Unsupported Currency Deal",
      description: "Deal with unsupported currency",
      currency: "XXX",
      items: [{ name: "Item 1", price: 100, quantity: 1 }],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", createDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException when price or quantity is negative", async () => {
    const negativeDealDto: CreateDealDto = {
      name: "Negative Deal",
      description: "Deal with negative values",
      currency: "USD",
      items: [{ name: "Negative Item", price: -100, quantity: -5 }],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", negativeDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException if the deal name is too long", async () => {
    const longNameDealDto: CreateDealDto = {
      name: "a".repeat(300),
      description: "Deal with long name",
      currency: "USD",
      items: [{ name: "Item 1", price: 100, quantity: 2 }],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", longNameDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw NotFoundException if seller is not found", async () => {
    prismaMock.seller.findUnique.mockResolvedValue(null);

    await expect(
      sellersService.createNewDeal("invalidSellerId", createDealDto)
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw BadRequestException for invalid currency format", async () => {
    const invalidCurrencyDealDto: CreateDealDto = {
      name: "New Deal",
      description: "Deal with invalid currency",
      currency: "123-INVALID",
      items: [{ name: "Item 1", price: 100, quantity: 2 }],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", invalidCurrencyDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException if there are duplicate item names in the deal", async () => {
    const duplicateItemsDealDto: CreateDealDto = {
      name: "Duplicate Items Deal",
      description: "Deal with duplicate item names",
      currency: "USD",
      items: [
        { name: "Item 1", price: 100, quantity: 2 },
        { name: "Item 1", price: 150, quantity: 3 },
      ],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", duplicateItemsDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException when transaction fails", async () => {
    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);
    prismaMock.$transaction.mockRejectedValue(new Error("Transaction failed"));

    await expect(
      sellersService.createNewDeal("sellerId", createDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException when an item has undefined fields", async () => {
    const invalidItemDto: CreateDealDto = {
      name: "Invalid Deal",
      description: "Deal with invalid item",
      currency: "USD",
      items: [
        {
          name: undefined as any,
          price: undefined as any,
          quantity: undefined as any,
        },
      ],
    };

    prismaMock.seller.findUnique.mockResolvedValue(mockSeller);

    await expect(
      sellersService.createNewDeal("sellerId", invalidItemDto)
    ).rejects.toThrow(BadRequestException);
  });
});

describe("SellersService - Update Deal", () => {
  let sellersService: SellersService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let webhookServiceMock: DeepMockProxy<WebhookService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();
    webhookServiceMock = mockDeep<WebhookService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: WebhookService, useValue: webhookServiceMock },
      ],
    }).compile();

    sellersService = module.get<SellersService>(SellersService);
  });

  const updateDealDto: UpdateDealDto = {
    name: "Updated Deal",
    status: DealStatus.SOLD as any,
    items: [{ id: "item1", name: "Updated Item 1", price: 150, quantity: 3 }],
  };

  it("should successfully update a deal", async () => {
    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);
    prismaMock.$transaction.mockResolvedValue(mockUpdatedDeal);

    const result = await sellersService.updateDeal(
      "sellerId",
      "dealId",
      updateDealDto
    );

    expect(result.message).toEqual("Deal updated successfully");
    expect(result.deal.name).toEqual(mockUpdatedDeal.name);
    expect(prismaMock.deal.findFirst).toHaveBeenCalledWith({
      where: { id: "dealId", sellerId: "sellerId" },
      include: { items: true, discount: true },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("should throw NotFoundException if deal is not found", async () => {
    prismaMock.deal.findFirst.mockResolvedValue(null);

    await expect(
      sellersService.updateDeal("sellerId", "invalidDealId", updateDealDto)
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw BadRequestException if updated deal results in overflow totalPrice", async () => {
    const overflowUpdateDto: UpdateDealDto = {
      ...updateDealDto,
      items: [
        {
          id: "item1",
          name: "Overflow Item",
          price: Number.MAX_SAFE_INTEGER,
          quantity: Number.MAX_SAFE_INTEGER,
        },
      ],
    };

    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);

    await expect(
      sellersService.updateDeal("sellerId", "dealId", overflowUpdateDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException if a required field is removed during update", async () => {
    const invalidUpdateDto: UpdateDealDto = {
      name: null,
      status: DealStatus.AVAILABLE as any,
      items: [{ id: "item1", name: "Updated Item 1", price: 150, quantity: 3 }],
    };

    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);

    await expect(
      sellersService.updateDeal("sellerId", "dealId", invalidUpdateDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw BadRequestException if updated deal has no items", async () => {
    const emptyItemsUpdateDto: UpdateDealDto = {
      name: "Empty Items Deal",
      status: DealStatus.AVAILABLE as any,
      items: [],
    };

    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);

    await expect(
      sellersService.updateDeal("sellerId", "dealId", emptyItemsUpdateDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should only update the specified fields for the deal items", async () => {
    const partialUpdateDto: UpdateDealDto = {
      items: [{ id: "item1", quantity: 5, name: null, price: null }],
    };

    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);
    prismaMock.$transaction.mockResolvedValue({
      ...mockDeal,
      items: [{ id: "item1", name: "Item 1", price: 100, quantity: 5 }],
    });

    const result = await sellersService.updateDeal(
      "sellerId",
      "dealId",
      partialUpdateDto
    );

    expect(result.deal.items[0].quantity).toEqual(5);
    expect(result.deal.items[0].price).toEqual(100);
  });

  it("should throw BadRequestException for an invalid deal status", async () => {
    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);

    const updateDealDto: UpdateDealDto = {
      name: "Invalid Status Deal",
      status: "INVALID_STATUS" as any,
    };

    await expect(
      sellersService.updateDeal("sellerId", "dealId", updateDealDto)
    ).rejects.toThrow(BadRequestException);
  });

  it("should return original deal if no updates are made", async () => {
    const sameDataUpdateDto: UpdateDealDto = {
      name: mockDeal.name,
      status: mockDeal.status as any,
      items: [...mockDeal.items],
    };

    prismaMock.deal.findFirst.mockResolvedValue(mockDeal);
    prismaMock.$transaction.mockResolvedValue(mockDeal);

    const result = await sellersService.updateDeal(
      "sellerId",
      "dealId",
      sameDataUpdateDto
    );

    expect(result.deal.name).toEqual(mockDeal.name);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
