import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../database/prisma.service';
import { CustomLoggerService } from '@common/services/logger.service';
import { DeliveryStatus, WebhookEventType } from '@prisma/client';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookService {

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly configService: ConfigService,
  ) {}

  private signWebhookPayload(payload: any, secretKey: string): string {
    const hmac = createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

/**
 * Queues a webhook notification for a buyer when a deal event occurs.
 * Signs the payload and adds it to the notifications queue for delivery.
 * 
 * @param buyerId The buyer's ID.
 * @param dealId The deal's ID.
 * @param eventType The type of event (e.g., DEAL_CREATED).
 */
  async queueDealWebhookNotification(buyerId: string, dealId: string, eventType: WebhookEventType): Promise<void> {
    try {
      const buyer = await this.prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { id: true, webhookUrl: true, secretKey: true },
      });

      const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });

      if (!buyer?.webhookUrl || !buyer.secretKey || !deal) {
        this.customLogger.error(`Invalid webhook data: buyerId: ${buyerId}, dealId: ${dealId}`);
        return;
      }

      const payload = {
        event: eventType,
        deal: {
          id: deal.id,
          name: deal.name,
          totalPrice: deal.totalPrice,
          status: deal.status,
        },
        buyerId: buyer.id,
      };

      const signature = this.signWebhookPayload(payload, buyer.secretKey);

      const retryAttempts = this.configService.get<number>('webhook.retryAttempts', 5);
      const backoffType = this.configService.get<string>('webhook.backoffType', 'fixed');
      const backoffDelay = this.configService.get<number>('webhook.backoffDelay', 60000);

      await this.notificationsQueue.add('send-webhook', {
        payload,
        signature,
        webhookUrl: buyer.webhookUrl,
        event: eventType,
        buyerId: buyer.id,
      },
      {
        attempts: retryAttempts,
        backoff: {
          type: backoffType,
          delay: backoffDelay,
        },
      });

      this.customLogger.log(`Queued webhook job for Buyer ${buyerId}, Deal ${dealId}, Event ${eventType}`);
    } catch (error) {
      this.customLogger.error(`Failed to queue webhook job for Buyer ${buyerId}, Deal ${dealId}, Event ${eventType}`, error);
    }
  }


/**
 * Logs the delivery status of a webhook notification.
 * 
 * @param buyerId The buyer's ID.
 * @param dealId The deal's ID.
 * @param eventType The type of event (e.g., DEAL_UPDATED).
 * @param status The delivery status (e.g., SUCCESS, FAILED).
 * @param payload The data sent in the webhook.
 * @param signature The signature for verification.
 */
  async recordWebhookDelivery(
    buyerId: string,
    dealId: string,
    eventType: WebhookEventType,
    status: DeliveryStatus,
    payload: any,
    signature: string
  ): Promise<void> {
    try {

      if (!buyerId) {
        throw new Error('Buyer ID is required to record webhook delivery.');
      }

      await this.prisma.webhookDelivery.create({
        data: {
          buyerId,
          dealId,
          eventType,
          status,
          payload,
          signature,
        },
      });

      this.customLogger.log(`Recorded webhook delivery for Buyer ${buyerId}, Deal ${dealId}, Status: ${status}`);
    } catch (error) {
      this.customLogger.error(`Failed to record webhook delivery for Buyer ${buyerId}, Deal ${dealId}`, error);
    }
  }
}
