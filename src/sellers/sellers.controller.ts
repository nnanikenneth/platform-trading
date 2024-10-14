import {
  Controller,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SellersService } from "./sellers.service";
import { FastifyRequest } from "fastify";
import { AuthGuard } from "@nestjs/passport";
import { Role, User } from "@prisma/client";
import { AuthorizationRequestDto } from "./dto/authorization-request.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { CreateDealDto } from "./dto/create-deal.dto";
import { CustomLoggerService } from "../common/services/logger.service";
import { RolesGuard } from "@src/auth/guards/roles.guard";
import { Roles } from "@src/common/decorators/roles.decorator";

@Controller("sellers")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class SellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * POST /sellers/deals
   * Create a new deal for the authenticated seller and send new deal alerts.
   */
  @Post("deals")
  @Roles(Role.SELLER)
  @HttpCode(201)
  async createNewDeal(
    @Req() req: FastifyRequest & { user: User },
    @Body() createDealDto: CreateDealDto
  ) {
    const userId = req.user.id;
    try {
      const seller = await this.sellersService.findSellerByUserId(userId);
      if (!seller) {
        this.logger.warn(`Seller not found for userId: ${userId}`);
        throw new NotFoundException("Seller not found");
      }

      this.logger.log(`Creating new deal for seller ${seller.id}`);
      const result = await this.sellersService.createNewDeal(
        seller.id,
        createDealDto
      );
      this.logger.log(`Deal created successfully for seller ${seller.id}`);
      return result;
    } catch (error) {
      this.handleError(error, "Failed to create new deal.");
    }
    return { message: "Failed to create deal" };
  }

  /**
   * PUT /sellers/deals/{dealId}
   * Update an existing deal for the authenticated seller.
   */
  @Put("deals/:dealId")
  @Roles(Role.SELLER)
  @HttpCode(200)
  async updateDeal(
    @Req() req: FastifyRequest & { user: User },
    @Param("dealId") dealId: string,
    @Body() updateDealDto: UpdateDealDto
  ) {
    const userId = req.user.id;
    try {
      const seller = await this.sellersService.findSellerByUserId(userId);
      if (!seller) {
        this.logger.warn(`Seller not found for userId: ${userId}`);
        throw new NotFoundException("Seller not found");
      }

      this.logger.log(`Updating deal ${dealId} for seller ${seller.id}`);
      const result = await this.sellersService.updateDeal(
        seller.id,
        dealId,
        updateDealDto
      );
      this.logger.log(
        `Deal ${dealId} updated successfully for seller ${seller.id}`
      );
      return result;
    } catch (error) {
      this.handleError(error, "Failed to update deal.");
    }
    return { message: "Failed to update deal" };
  }

  /**
   * PATCH /sellers/requests/{buyerId}/approve
   * Approve or reject authorization requests from buyers.
   */
  @Patch("requests/:buyerId/approve")
  @Roles(Role.SELLER)
  @HttpCode(200)
  async approveAuthorizationRequest(
    @Req() req: FastifyRequest & { user: User },
    @Param("buyerId") buyerId: string,
    @Body() body: AuthorizationRequestDto
  ) {
    const userId = req.user.id;
    try {
      const seller = await this.sellersService.findSellerByUserId(userId);
      if (!seller) {
        this.logger.warn(`Seller not found for userId: ${userId}`);
        throw new NotFoundException("Seller not found");
      }

      this.logger.log(
        `Processing authorization request for buyer ${buyerId} by seller ${seller.id}`
      );
      const result = await this.sellersService.approveAuthorizationRequest(
        seller.id,
        buyerId,
        body.approve,
        body.authorizationLevel
      );
      this.logger.log(
        `Authorization request processed successfully for buyer ${buyerId}`
      );
      return result;
    } catch (error) {
      this.handleError(error, "Failed to process authorization request.");
    }
    return { message: "Failed to process authorization request" };
  }

  /**
   * DELETE /sellers/authorized-buyers/{buyerId}
   * Revoke a buyer's authorization to access the seller's deals.
   */
  @Delete("authorized-buyers/:buyerId")
  @Roles(Role.SELLER)
  @HttpCode(200)
  async revokeBuyerAuthorization(
    @Req() req: FastifyRequest & { user: User },
    @Param("buyerId") buyerId: string
  ) {
    const userId = req.user.id;
    try {
      const seller = await this.sellersService.findSellerByUserId(userId);
      if (!seller) {
        this.logger.warn(`Seller not found for userId: ${userId}`);
        throw new NotFoundException("Seller not found");
      }

      this.logger.log(
        `Revoking authorization for buyer ${buyerId} by seller ${seller.id}`
      );
      const result = await this.sellersService.revokeBuyerAuthorization(
        seller.id,
        buyerId
      );
      this.logger.log(
        `Authorization revoked successfully for buyer ${buyerId}`
      );
      return result;
    } catch (error) {
      this.handleError(error, "Failed to revoke authorization.");
    }
    return { message: "Failed to revoke authorization" };
  }

  private handleError(error: any, defaultMessage: string): void {
    if (error instanceof Error) {
      this.logger.error(defaultMessage, error.message);
    } else {
      this.logger.error(defaultMessage, String(error));
    }
    throw new BadRequestException(defaultMessage);
  }
}
