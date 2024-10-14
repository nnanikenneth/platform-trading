import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpdateDealDto } from "./dto/update-deal.dto";
import {
  WebhookEventType,
  AuthorizationRequestStatus,
  AuthorizationLevel,
  DealStatus,
} from "@prisma/client";
import { WebhookService } from "@src/webhooks/webhook.service";
import { CreateDealDto } from "./dto/create-deal.dto";

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService
  ) {}

  private prepareUpdateData<T, K extends keyof T>(
    original: T,
    updated: Partial<T>,
    fields: K[]
  ): Partial<Pick<T, K>> {
    return fields.reduce((data, field) => {
      if (updated[field] !== undefined && original[field] !== updated[field]) {
        data[field] = updated[field] as NonNullable<T[K]>;
      }
      return data;
    }, {} as Partial<Pick<T, K>>);
  }

  /**
   * Finds the seller by their user ID.
   * Throws NotFoundException if the seller is not found.
   */
  async findSellerByUserId(userId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException("Seller not found");
    }

    return seller;
  }

  /**
   * Creates a new deal for the specified seller.
   * Automatically calculates the total price from the deal items.
   * Sends deal alerts to authorized buyers.
   */
  async createNewDeal(sellerId: string, createDealDto: CreateDealDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException("Seller not found");
    }

    try {
      const deal = await this.prisma.$transaction(async (prisma) => {
        const inferredTotalPrice = createDealDto.items.reduce((sum, item) => {
          return sum + item.price * item.quantity;
        }, 0);

        const newDeal = await prisma.deal.create({
          data: {
            name: createDealDto.name,
            description: createDealDto.description,
            totalPrice: inferredTotalPrice,
            currency: createDealDto.currency,
            sellerId: seller.id,
            status: DealStatus.AVAILABLE,

            items: {
              create: createDealDto.items.map((item) => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
              })),
            },

            discount: createDealDto.discount
              ? {
                  create: {
                    type: createDealDto.discount.type,
                    amount: createDealDto.discount.amount,
                  },
                }
              : undefined,
          },
          include: {
            items: true,
            discount: true,
          },
        });

        return newDeal;
      });

      await this.sendDealAlerts(seller.id, deal.id, WebhookEventType.NEW_DEAL);

      return {
        statusCode: 201,
        message: "Deal created successfully",
        deal: {
          name: deal.name,
          seller: deal.sellerId,
          total_price: deal.totalPrice,
          currency: deal.currency,
          status: deal.status,
          discount: deal.discount
            ? {
                type: deal.discount.type,
                amount: deal.discount.amount,
              }
            : null,
          items: deal.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `Failed to create deal: ${error.message}`
          : "Failed to create deal due to an unknown error."
      );
    }
  }

  /**
   * Updates an existing deal for the specified seller.
   * Recalculates the total price and updates items and discounts.
   * Sends deal alerts or notifications based on the updates.
   */
  async updateDeal(
    sellerId: string,
    dealId: string,
    updateDealDto: UpdateDealDto
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, sellerId },
      include: { items: true, discount: true },
    });

    if (!deal) {
      throw new NotFoundException("Deal not found");
    }

    try {
      const updatedDeal = await this.prisma.$transaction(async (prisma) => {
        let inferredTotalPrice = deal.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        if (updateDealDto.items) {
          inferredTotalPrice += updateDealDto.items.reduce((sum, item) => {
            const itemPrice = item.price ?? 0;
            const itemQuantity = item.quantity ?? 1;
            return sum + itemPrice * itemQuantity;
          }, 0);
        }

        const dealUpdate = await prisma.deal.update({
          where: { id: dealId },
          data: {
            name: updateDealDto.name,
            description: updateDealDto.description,
            totalPrice: inferredTotalPrice,
            currency: updateDealDto.currency,
            status: updateDealDto.status,
            imageUrl: updateDealDto.imageUrl,
            updatedAt: new Date(),
          },
          include: {
            items: true,
            discount: true,
          },
        });

        const newItems =
          updateDealDto.items
            ?.filter((item) => !item.id)
            .map((item) => ({
              name: item.name!,
              price: item.price!,
              quantity: item.quantity!,
              dealId: dealId,
            })) || [];

        if (newItems.length > 0) {
          await prisma.item.createMany({
            data: newItems,
          });

          const newlyCreatedItems = await prisma.item.findMany({
            where: { dealId: dealId },
          });

          dealUpdate.items = [...dealUpdate.items, ...newlyCreatedItems];
        }

        if (updateDealDto.items) {
          for (const updatedItem of updateDealDto.items) {
            if (updatedItem.id) {
              const existingItem = deal.items.find(
                (item) => item.id === updatedItem.id
              );

              if (existingItem) {
                const itemUpdateData = this.prepareUpdateData(
                  existingItem,
                  updatedItem,
                  ["name", "price", "quantity", "id"]
                );
                if (Object.keys(itemUpdateData).length > 0) {
                  await prisma.item.update({
                    where: { id: updatedItem.id },
                    data: itemUpdateData,
                  });
                }
              }
            }
          }
        }

        if (updateDealDto.discount) {
          await prisma.discount.upsert({
            where: { dealId: dealId },
            create: {
              type: updateDealDto.discount.type!,
              amount: updateDealDto.discount.amount!,
              dealId: dealId,
            },
            update: {
              type: updateDealDto.discount.type!,
              amount: updateDealDto.discount.amount!,
            },
          });
        } else if (deal.discount) {
          await prisma.discount.delete({
            where: { id: deal.discount.id },
          });
        }

        return dealUpdate;
      });

      const eventType = this.determineEventType(deal, updateDealDto);
      await this.sendDealAlerts(sellerId, dealId, eventType);

      return {
        statusCode: 200,
        message: "Deal updated successfully",
        deal: {
          name: updatedDeal.name,
          seller: updatedDeal.sellerId,
          total_price: updatedDeal.totalPrice,
          currency: updatedDeal.currency,
          status: updatedDeal.status,
          discount: updatedDeal.discount
            ? {
                id: updatedDeal.discount.id,
                type: updatedDeal.discount.type,
                amount: updatedDeal.discount.amount,
              }
            : null,
          items: updatedDeal.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to update the deal. Transaction was not successful."
      );
    }
  }

  /**
   * Approves or rejects a buyer's authorization request for the seller's deals.
   * Grants the buyer access or marks the request as rejected.
   */
  async approveAuthorizationRequest(
    sellerId: string,
    buyerId: string,
    approve: boolean,
    authorizationLevel: AuthorizationLevel = AuthorizationLevel.VIEW_ONLY
  ) {
    const request = await this.prisma.authorizationRequest.findFirst({
      where: { sellerId, buyerId, status: AuthorizationRequestStatus.PENDING },
    });

    if (!request) {
      throw new NotFoundException("Authorization request not found");
    }

    try {
      if (approve) {
        await this.prisma.buyerSeller.create({
          data: {
            buyerId,
            sellerId,
            authorizationLevel,
          },
        });

        await this.prisma.authorizationRequest.update({
          where: { id: request.id },
          data: { status: AuthorizationRequestStatus.APPROVED },
        });

        return {
          statusCode: 200,
          message: "Authorization request approved",
        };
      } else {
        await this.prisma.authorizationRequest.update({
          where: { id: request.id },
          data: { status: AuthorizationRequestStatus.REJECTED },
        });

        return {
          statusCode: 200,
          message: "Authorization request rejected",
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to process authorization request: ${error.message}`
        );
      }
      throw new BadRequestException(
        "Failed to process authorization request due to an unknown error."
      );
    }
  }

  /**
   * Revokes a buyer's authorization to access the seller's deals.
   */
  async revokeBuyerAuthorization(sellerId: string, buyerId: string) {
    const authorization = await this.prisma.buyerSeller.findFirst({
      where: { sellerId, buyerId },
    });

    if (!authorization) {
      throw new NotFoundException("Authorization not found");
    }

    try {
      await this.prisma.buyerSeller.delete({
        where: { id: authorization.id },
      });

      return {
        statusCode: 200,
        message: "Authorization revoked successfully",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to revoke authorization: ${error.message}`
        );
      }
      throw new BadRequestException(
        "Failed to revoke authorization due to an unknown error."
      );
    }
  }

  /**
   * Sends deal alerts to buyers authorized by the seller.
   * This notifies buyers of any changes or updates to deals.
   */
  private async sendDealAlerts(
    sellerId: string,
    dealId: string,
    eventType: WebhookEventType
  ) {
    const authorizedBuyers = await this.prisma.buyerSeller.findMany({
      where: { sellerId },
      include: { buyer: true },
    });

    if (Array.isArray(authorizedBuyers)) {
      for (const authorizedBuyer of authorizedBuyers) {
        const { buyer } = authorizedBuyer;
        if (buyer?.webhookUrl) {
          this.webhookService.queueDealWebhookNotification(
            buyer.id,
            dealId,
            eventType
          );
        }
      }
    } else {
      console.warn("No authorized buyers found");
    }
  }

  /**
   * Determines the appropriate event type based on changes made to the deal.
   * Used to trigger the correct webhook notifications.
   */
  private determineEventType(
    originalDeal: any,
    updatedDeal: any
  ): WebhookEventType {
    if (originalDeal.totalPrice !== updatedDeal.totalPrice) {
      return WebhookEventType.PRICE_CHANGE;
    }
    if (originalDeal.status !== updatedDeal.status) {
      return WebhookEventType.STATUS_CHANGE;
    }
    if (
      updatedDeal.discount &&
      originalDeal.discount !== updatedDeal.discount
    ) {
      return WebhookEventType.DISCOUNT_ADDED;
    }
    return WebhookEventType.DEAL_UPDATED;
  }
}
