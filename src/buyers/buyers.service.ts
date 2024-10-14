import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DealStatus, AuthorizationRequestStatus, Item } from "@prisma/client";
import { isURL } from "validator";

@Injectable()
export class BuyersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a buyer by the userId.
   * @returns The buyer associated with the userId.
   */
  async findBuyerByUserId(userId: string) {
    try {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId },
      });

      if (!buyer) {
        throw new NotFoundException({
          statusCode: 404,
          message: "Buyer not found for the given user ID.",
        });
      }

      return buyer;
    } catch (error) {
      return this.handleUnexpectedError(
        "Failed to find buyer by user ID",
        error
      );
    }
  }

  /**
   * Fetch all deals (authorized and public) for a buyer.
   * Combines public deals and private deals that the buyer has explicit authorization for.
   * Includes only selected fields for deals (name, sellerId, totalPrice, currency, discount, status, items).
   * @returns List of authorized and public deals with selected fields for deals, items, and discounts
   */
  async getAllDeals(buyerId: string) {
    try {
      const authorizedDeals = await this.prisma.buyerSeller.findMany({
        where: { buyerId },
        include: {
          seller: {
            include: {
              deals: {
                where: { status: DealStatus.AVAILABLE },
                select: {
                  name: true,
                  sellerId: true,
                  totalPrice: true,
                  currency: true,
                  status: true,
                  discount: {
                    select: {
                      type: true,
                      amount: true,
                    },
                  },
                  items: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const publicDeals = await this.prisma.deal.findMany({
        where: {
          seller: { publicAccess: true },
          status: DealStatus.AVAILABLE,
        },
        select: {
          name: true,
          sellerId: true,
          totalPrice: true,
          currency: true,
          status: true,
          discount: {
            select: {
              type: true,
              amount: true,
            },
          },
          items: {
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
            },
          },
        },
      });

      const authorizedPrivateDeals = authorizedDeals.flatMap(
        (auth) => auth.seller.deals
      );

      const mapDeals = (deals) =>
        deals.map((deal) => ({
          name: deal.name,
          sellerId: deal.sellerId,
          total_price: deal.totalPrice,
          currency: deal.currency,
          status: deal.status,
          discount: deal.discount
            ? {
                type: deal.discount.type,
                amount: deal.discount.amount,
              }
            : null,
          items: deal.items.map((item: Item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }));

      const mappedPublicDeals = mapDeals(publicDeals);
      const mappedPrivateDeals = mapDeals(authorizedPrivateDeals);

      return {
        statusCode: 200,
        deals: [...mappedPublicDeals, ...mappedPrivateDeals],
      };
    } catch (error) {
      return this.handleUnexpectedError(
        "Failed to fetch authorized and public deals",
        error
      );
    }
  }

  /**
   * Fetch only private deals that the buyer has explicit authorization to access.
   * Includes only selected fields for deals (name, sellerId, totalPrice, currency, discount, status, items).
   * @returns List of authorized private deals with selected fields for deals, items, and discounts
   */
  async getAuthorizedPrivateDeals(buyerId: string) {
    try {
      const authorizedDeals = await this.prisma.buyerSeller.findMany({
        where: { buyerId },
        include: {
          seller: {
            include: {
              deals: {
                where: { status: DealStatus.AVAILABLE },
                select: {
                  name: true,
                  sellerId: true,
                  totalPrice: true,
                  currency: true,
                  status: true,
                  discount: {
                    select: {
                      type: true,
                      amount: true,
                    },
                  },
                  items: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const privateDeals = authorizedDeals.flatMap((auth) => auth.seller.deals);

      if (privateDeals.length === 0) {
        throw new NotFoundException({
          statusCode: 404,
          message: "No private deals found for this buyer.",
        });
      }

      return {
        statusCode: 200,
        privateDeals: privateDeals.map((deal) => ({
          ...deal,
          total_price: deal.totalPrice,
          totalPrice: undefined,
        })),
      };
    } catch (error) {
      return this.handleUnexpectedError("Failed to fetch private deals", error);
    }
  }

  /**
   * View deals for a specific seller that the buyer is authorized to view.
   * Includes public deals or authorized private deals.
   * @returns List of deals from the specified seller
   */
  async getDealsForSpecificSeller(buyerId: string, sellerId: string) {
    try {
      const authorization = await this.prisma.buyerSeller.findFirst({
        where: { buyerId, sellerId },
      });

      if (!authorization && !(await this.isSellerPublic(sellerId))) {
        throw new BadRequestException({
          statusCode: 403,
          message: "Not authorized to view this seller’s private deals.",
        });
      }

      const deals = await this.prisma.deal.findMany({
        where: { sellerId, status: DealStatus.AVAILABLE },
        select: {
          name: true,
          sellerId: true,
          totalPrice: true,
          currency: true,
          discount: {
            select: {
              type: true,
              amount: true,
            },
          },
          items: {
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
            },
          },
        },
      });

      if (deals.length === 0) {
        throw new NotFoundException({
          statusCode: 404,
          message: "No deals found for this seller.",
        });
      }

      return {
        statusCode: 200,
        deals: deals.map((deal) => ({
          name: deal.name,
          sellerId: deal.sellerId,
          total_price: deal.totalPrice,
          currency: deal.currency,
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
        })),
      };
    } catch (error) {
      return this.handleUnexpectedError(
        "Failed to fetch deals for the specific seller",
        error
      );
    }
  }

  /**
   * Set or update the webhook URL for a buyer.
   * Validates the URL format before saving.
   * @returns Success message with the buyer's details
   */
  async setWebhook(buyerId: string, webhookUrl: string) {
    if (!isURL(webhookUrl)) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Invalid webhook URL format.",
      });
    }

    try {
      const updatedBuyer = await this.prisma.buyer.update({
        where: { id: buyerId },
        data: { webhookUrl },
        include: { user: true },
      });

      return {
        statusCode: 200,
        message: "Webhook URL updated successfully.",
        buyer: updatedBuyer,
      };
    } catch (error) {
      return this.handleUnexpectedError("Failed to update webhook URL", error);
    }
  }

  /**
   * Request access to a seller's private deals.
   * Validates that the request does not already exist and sends a request if valid.
   * @returns Success message with request details
   */
  async requestAccess(buyerId: string, sellerId: string, message: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new NotFoundException({
          statusCode: 404,
          message: "Seller not found.",
        });
      }

      const buyer = await this.prisma.buyer.findUnique({
        where: { id: buyerId },
      });

      if (!buyer) {
        throw new NotFoundException({
          statusCode: 404,
          message: "Buyer not found.",
        });
      }

      const existingRequest = await this.prisma.authorizationRequest.findFirst({
        where: {
          buyerId: buyerId,
          sellerId: sellerId,
          status: AuthorizationRequestStatus.PENDING,
        },
      });

      if (existingRequest) {
        throw new BadRequestException({
          statusCode: 400,
          message:
            "An access request is already pending for this buyer and seller.",
        });
      }
      const request = await this.prisma.authorizationRequest.create({
        data: {
          buyerId: buyerId,
          sellerId: sellerId,
          status: AuthorizationRequestStatus.PENDING,
          message: message || "",
        },
      });
      return {
        statusCode: 200,
        message: "Access request sent successfully.",
        request: {
          id: request.id,
          buyerId: request.buyerId,
          sellerId: request.sellerId,
          status: request.status,
          message: request.message,
          createdAt: request.createdAt,
        },
      };
    } catch (error) {
      return this.handleUnexpectedError("Failed to send access request", error);
    }
  }

  /**
   * Helper method to check if a seller has public access enabled.
   * @returns Boolean indicating if the seller allows public access
   */
  private async isSellerPublic(sellerId: string): Promise<boolean> {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: { publicAccess: true },
    });
    return seller?.publicAccess || false;
  }

  /**
   * General error handler to wrap InternalServerErrorExceptions.
   */
  private handleUnexpectedError(message: string, error: any): any {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new InternalServerErrorException({
      statusCode: 500,
      message: message,
      error: error?.message || "An unexpected error occurred",
    });
  }
}
