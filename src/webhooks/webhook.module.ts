import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CustomLoggerService } from '@common/services/logger.service';
import { WebhookService } from '@src/webhooks/webhook.service';
import { WebhookWorker } from '@src/workers/webhook.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    WebhookService,
    CustomLoggerService,
    WebhookWorker,
  ],
  exports: [WebhookService, BullModule],
})

export class WebhookModule {}
