import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { IsOptional, IsEmail, IsString } from 'class-validator';
import { WebhookEventType } from '@prisma/client';
import { WebhookService } from './webhooks/webhook.service';


export class GetUserDetailsDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;
}

@Controller('test')
export class TestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('get-details')
  async getUserDetails(@Body() getUserDetailsDto: GetUserDetailsDto) {
    const { email, buyerId, sellerId, dealId } = getUserDetailsDto;

    let user;

    // Query based on email if provided
    if (email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    // If no user found by email, try with buyerId
    if (!user && buyerId) {
      const buyer = await this.prisma.buyer.findUnique({
        where: { id: buyerId },
        include: { user: true },
      });
      user = buyer?.user;
    }

    // If no user found by buyerId, try with sellerId
    if (!user && sellerId) {
      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
        include: { user: true },
      });
      user = seller?.user;
    }

    // If no user found by sellerId, try with dealId
    if (!user && dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        include: { seller: { include: { user: true } } },
      });
      user = deal?.seller.user;
    }

    // If no user found, throw error
    if (!user) {
      throw new BadRequestException('No user found for the given criteria');
    }

    // Generate token
    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      token,
      username: user.name,
      email: user.email,
      userDetails: user,
    };
  }


  /**
   * Route to trigger a test notification with a predefined payload.
   */
  @Post('test-notifications')
  async triggerTestNotification(): Promise<{ message: string }> {
      // Prepare the test payload with deal and webhook details
      
      for (let i = 0; i < 100; i++) { // REMOVE LATER  
        
        const event = WebhookEventType.DISCOUNT_ADDED;
        const url = 'https://trading-platform.free.beeceptor.com';
        const dealId = '00231558-ba2e-49ab-ac22-b4c8aed0eb19';

        // Call the notification service to handle the logic
        // also brainstorm what you will do when some jobs fail
        // do i create another job to track this on intervals...how do i do this
        await this.webhookService.queueDealWebhookNotification(url, dealId, event);

        await new Promise(resolve => setTimeout(resolve, 500)); 
    } // REMOVE LATER

    return { message: 'Test notification triggered successfully' };
  }
}
