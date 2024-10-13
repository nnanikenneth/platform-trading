import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { BuyersService } from "./buyers.service";
import { FastifyRequest } from "fastify";
import { AuthGuard } from "@nestjs/passport";
import { User } from "@prisma/client";
import { isURL } from "validator";

@Controller("buyers")
@UseGuards(AuthGuard("jwt"))
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  /**
   * GET /buyers/authorized-deals
   * Fetch all authorized and public deals for the authenticated buyer.
   * Combines public deals and private deals where the buyer has explicit authorization.
   */
  @Get("authorized-deals")
  @HttpCode(200)
  async getAllAuthorizedDeals(@Req() req: FastifyRequest & { user: User }) {
    try {
      const userId = req.user.id;
      const buyer = await this.buyersService.findBuyerByUserId(userId);
      if (!buyer)
        throw new UnauthorizedException(
          "No buyer profile found for this user."
        );

      const buyerId = buyer.id;
      return await this.buyersService.getAllDeals(buyerId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          "Unauthorized access, invalid or expired token."
        );
      }
      this.handleUnexpectedError("Failed to retrieve authorized deals", error);
    }
  }

  /**
   * GET /buyers/authorized-deals/private
   * Fetch only private deals that the authenticated buyer has explicit authorization to access.
   */
  @Get("authorized-deals/private")
  @HttpCode(200)
  async getAuthorizedPrivateDeals(@Req() req: FastifyRequest & { user: User }) {
    try {
      const userId = req.user.id;
      const buyer = await this.buyersService.findBuyerByUserId(userId);
      if (!buyer)
        throw new UnauthorizedException(
          "No buyer profile found for this user."
        );

      const buyerId = buyer.id;
      return await this.buyersService.getAuthorizedPrivateDeals(buyerId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("No private deals found for this buyer.");
      }
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          "Unauthorized access, invalid or expired token."
        );
      }
      this.handleUnexpectedError("Failed to retrieve private deals", error);
    }
  }

  /**
   * GET /buyers/{buyerId}/sellers/{sellerId}/deals
   * View deals for a specific seller that the buyer is authorized to view.
   * Includes public deals and authorized private deals.
   */
  @Get(":buyerId/sellers/:sellerId/deals")
  @HttpCode(200)
  async getDealsForSpecificSeller(
    @Param("buyerId") buyerId: string,
    @Param("sellerId") sellerId: string
  ) {
    try {
      return await this.buyersService.getDealsForSpecificSeller(
        buyerId,
        sellerId
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("No deals found for this seller.");
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(
          "You are not authorized to view this seller’s private deals."
        );
      }
      this.handleUnexpectedError("Failed to retrieve seller’s deals", error);
    }
  }

  /**
   * POST /buyers/webhook
   * Set or update the webhook URL for the authenticated buyer.
   * Validates the webhook URL before saving.
   */
  @Post("webhook")
  @HttpCode(200)
  async setWebhook(
    @Req() req: FastifyRequest & { user: User },
    @Body("webhookUrl") webhookUrl: string
  ) {
    if (!isURL(webhookUrl)) {
      throw new BadRequestException("Invalid webhook URL format.");
    }

    try {
      const userId = req.user.id;
      const buyer = await this.buyersService.findBuyerByUserId(userId);
      if (!buyer)
        throw new UnauthorizedException(
          "No buyer profile found for this user."
        );

      const buyerId = buyer.id;
      return await this.buyersService.setWebhook(buyerId, webhookUrl);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          "Unauthorized access, invalid or expired token."
        );
      }
      this.handleUnexpectedError("Failed to update webhook URL", error);
    }
  }

  /**
   * POST /buyers/{buyerId}/sellers/{sellerId}/request-access
   * Request access to a seller's private deals.
   * Validates that the request is not already pending before sending the request.
   */
  @Post(":buyerId/sellers/:sellerId/request-access")
  @HttpCode(200)
  async requestAccess(
    @Param("buyerId") buyerId: string,
    @Param("sellerId") sellerId: string,
    @Body("message") message: string
  ) {
    try {
      return await this.buyersService.requestAccess(buyerId, sellerId, message);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException("An access request is already pending.");
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Seller not found.");
      }
      this.handleUnexpectedError("Failed to send access request", error);
    }
  }

  /**
   * General error handler to wrap InternalServerErrorExceptions.
   */
  private handleUnexpectedError(message: string, error: unknown): void {
    let errorMessage = "An unexpected error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new InternalServerErrorException({
      statusCode: 500,
      message: message,
      error: errorMessage,
    });
  }
}
