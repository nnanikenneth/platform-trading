import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import axios from 'axios';
import { CustomLoggerService } from '../common/services/logger.service';
import { WebhookEventType } from '@prisma/client';
import { WebhookService } from '@src/webhooks/webhook.service';

@Processor('notifications')
export class WebhookWorker {
  constructor(
    private readonly customLogger: CustomLoggerService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * Handles sending webhook notifications.
   * Sends the pre-signed payload to the webhook URL
   * Retries the job if the webhook delivery fails.
   * @param job The job object containing data for sending the webhook.
   */
  @Process('send-webhook')
  async handleSendWebhook(job: Job): Promise<void> {
    const { buyerId, webhookUrl, signature, payload, event } = job.data;
    const eventType: WebhookEventType = event;

    try {
      if (!buyerId) {
        throw new Error('Buyer ID is required to send webhook.');
      }

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
        },
      });

      this.customLogger.log(`Webhook sent to ${webhookUrl} with status: ${response.status}`);

      await this.webhookService.recordWebhookDelivery(
        buyerId,
        payload.deal.id,
        eventType,
        'SUCCESS',
        payload,
        signature
      );
    } catch (error) {
      this.customLogger.error(`Failed to send webhook to ${webhookUrl}: ${error}`);

      await this.webhookService.recordWebhookDelivery(
        buyerId,
        payload.deal.id,
        eventType,
        'FAILED',
        payload,
        signature
      );

      // Rethrow to trigger Bull's retry mechanism
      throw error;
    }
  }
}
