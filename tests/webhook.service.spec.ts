import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from '@src/webhooks/webhook.service';
import { Queue } from 'bull';
import { PrismaService } from '@src/database/prisma.service';
import { CustomLoggerService } from '@common/services/logger.service';
import { DeliveryStatus, WebhookEventType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let prismaMock: DeepMockProxy<PrismaService>;
  let notificationsQueueMock: DeepMockProxy<Queue>;
  let customLoggerMock: DeepMockProxy<CustomLoggerService>;
  let configServiceMock: DeepMockProxy<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: CustomLoggerService, useValue: mockDeep<CustomLoggerService>() },
        { provide: ConfigService, useValue: mockDeep<ConfigService>() },
        { provide: getQueueToken('notifications'), useValue: mockDeep<Queue>() },
      ],
    }).compile();

    webhookService = module.get<WebhookService>(WebhookService);
    prismaMock = module.get(PrismaService);
    notificationsQueueMock = module.get(getQueueToken('notifications'));
    customLoggerMock = module.get(CustomLoggerService);
    configServiceMock = module.get(ConfigService);
  });

  describe('queueDealWebhookNotification', () => {
    it('should queue a webhook job successfully', async () => {
      const buyerId = 'buyerId';
      const dealId = 'dealId';
      const eventType = WebhookEventType.DEAL_UPDATED;

      prismaMock.buyer.findUnique.mockResolvedValue({
        id: buyerId,
        webhookUrl: 'https://mock-webhook-url.com',
        secretKey: 'secretKey',
        createdAt: new Date(),
         updatedAt: new Date(),
          deletedAt: null,
           userId: "123"
      });
      prismaMock.deal.findUnique.mockResolvedValue({
        id: dealId,
        name: 'Mock Deal',
        totalPrice: 200,
        status: 'AVAILABLE',
        createdAt: new Date(),
         updatedAt: new Date(),
          deletedAt: null,
        sellerId: "abz",
        description: "Test description",
        currency: "USD",
        imageUrl: null,
      });
      configServiceMock.get.mockReturnValue(5);

      await webhookService.queueDealWebhookNotification(buyerId, dealId, eventType);

      expect(notificationsQueueMock.add).toHaveBeenCalledWith(
        'send-webhook',
        expect.objectContaining({
          payload: expect.any(Object),
          signature: expect.any(String),
          webhookUrl: 'https://mock-webhook-url.com',
        }),
        expect.any(Object)
      );
      expect(customLoggerMock.log).toHaveBeenCalledWith(`Queued webhook job for Buyer ${buyerId}, Deal ${dealId}, Event ${eventType}`);
    });

    it('should log an error when buyer or deal is invalid', async () => {
      const buyerId = 'buyerId';
      const dealId = 'dealId';
      const eventType = WebhookEventType.DEAL_UPDATED;

      prismaMock.buyer.findUnique.mockResolvedValue(null);
      prismaMock.deal.findUnique.mockResolvedValue(null);

      await webhookService.queueDealWebhookNotification(buyerId, dealId, eventType);

      expect(customLoggerMock.error).toHaveBeenCalledWith(`Invalid webhook data: buyerId: ${buyerId}, dealId: ${dealId}`);
    });

    it('should log an error when queueing fails', async () => {
      const buyerId = 'buyerId';
      const dealId = 'dealId';
      const eventType = WebhookEventType.DEAL_UPDATED;

      prismaMock.buyer.findUnique.mockResolvedValue({
        id: buyerId,
        webhookUrl: 'https://mock-webhook-url.com',
        secretKey: 'secretKey',
        createdAt: new Date(),
        updatedAt: new Date(),
         deletedAt: null,
          userId: "123"
      });
      prismaMock.deal.findUnique.mockResolvedValue({
        id: dealId,
        name: 'Mock Deal',
        totalPrice: 200,
        status: 'AVAILABLE',
        createdAt: new Date(),
         updatedAt: new Date(),
          deletedAt: null,
        sellerId: "abz",
        description: "Test description",
        currency: "USD",
        imageUrl: null,
      });

      notificationsQueueMock.add.mockRejectedValue(new Error('Queue failure'));

      await webhookService.queueDealWebhookNotification(buyerId, dealId, eventType);

      expect(customLoggerMock.error).toHaveBeenCalledWith(`Failed to queue webhook job for Buyer ${buyerId}, Deal ${dealId}, Event ${eventType}`, expect.any(Error));
    });
  });

  describe('recordWebhookDelivery', () => {
    it('should record a webhook delivery successfully', async () => {
      const buyerId = 'buyerId';
      const dealId = 'dealId';
      const eventType = WebhookEventType.DEAL_UPDATED;
      const status = DeliveryStatus.SUCCESS;
      const payload = { mock: 'payload' };
      const signature = 'mock-signature';

      await webhookService.recordWebhookDelivery(buyerId, dealId, eventType, status, payload, signature);

      expect(prismaMock.webhookDelivery.create).toHaveBeenCalledWith({
        data: {
          buyerId,
          dealId,
          eventType,
          status,
          payload,
          signature,
        },
      });
      expect(customLoggerMock.log).toHaveBeenCalledWith(`Recorded webhook delivery for Buyer ${buyerId}, Deal ${dealId}, Status: ${status}`);
    });

    it('should log an error if recording fails', async () => {
      const buyerId = 'buyerId';
      const dealId = 'dealId';
      const eventType = WebhookEventType.DEAL_UPDATED;
      const status = DeliveryStatus.FAILED;
      const payload = { mock: 'payload' };
      const signature = 'mock-signature';

      prismaMock.webhookDelivery.create.mockRejectedValue(new Error('DB Error'));

      await webhookService.recordWebhookDelivery(buyerId, dealId, eventType, status, payload, signature);

      expect(customLoggerMock.error).toHaveBeenCalledWith(`Failed to record webhook delivery for Buyer ${buyerId}, Deal ${dealId}`, expect.any(Error));
    });
  });
});
