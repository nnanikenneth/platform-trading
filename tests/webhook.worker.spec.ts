import { Test, TestingModule } from "@nestjs/testing";
import { WebhookWorker } from "@src/workers/webhook.worker";
import { CustomLoggerService } from "@common/services/logger.service";
import { WebhookService } from "@src/webhooks/webhook.service";
import { Job } from "bull";
import axios from "axios";
import { WebhookEventType } from "@prisma/client";
import { jest } from "@jest/globals";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("WebhookWorker", () => {
  let webhookWorker: WebhookWorker;
  let webhookServiceMock: jest.Mocked<WebhookService>;
  let customLoggerMock: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    customLoggerMock = {
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    webhookServiceMock = {
      recordWebhookDelivery: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookWorker,
        { provide: CustomLoggerService, useValue: customLoggerMock },
        { provide: WebhookService, useValue: webhookServiceMock },
      ],
    }).compile();

    webhookWorker = module.get<WebhookWorker>(WebhookWorker);
  });

  describe("handleSendWebhook", () => {
    const jobData = {
      buyerId: "buyer1",
      webhookUrl: "https://example.com/webhook",
      signature: "mockSignature",
      payload: {
        deal: {
          id: "deal1",
          name: "Deal Name",
          totalPrice: 100,
          status: "AVAILABLE",
        },
      },
      event: WebhookEventType.DEAL_UPDATED,
    };

    let job: Job;

    beforeEach(() => {
      job = {
        data: jobData,
        id: "job1",
        opts: {},
        attemptsMade: 0,
      } as Job;
    });

    it("should send a webhook and record SUCCESS", async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      await webhookWorker.handleSendWebhook(job);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        jobData.webhookUrl,
        jobData.payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Signature": jobData.signature,
          },
        }
      );
      expect(customLoggerMock.log).toHaveBeenCalledWith(
        `Webhook sent to ${jobData.webhookUrl} with status: 200`
      );
      expect(webhookServiceMock.recordWebhookDelivery).toHaveBeenCalledWith(
        jobData.buyerId,
        jobData.payload.deal.id,
        jobData.event,
        "SUCCESS",
        jobData.payload,
        jobData.signature
      );
    });

    it("should record FAILED if the webhook fails and rethrow the error", async () => {
      const error = new Error("Network error");
      mockedAxios.post.mockRejectedValue(error);

      await expect(webhookWorker.handleSendWebhook(job)).rejects.toThrow(error);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        jobData.webhookUrl,
        jobData.payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Signature": jobData.signature,
          },
        }
      );
      expect(customLoggerMock.error).toHaveBeenCalledWith(
        `Failed to send webhook to ${jobData.webhookUrl}: ${error}`
      );
      expect(webhookServiceMock.recordWebhookDelivery).toHaveBeenCalledWith(
        jobData.buyerId,
        jobData.payload.deal.id,
        jobData.event,
        "FAILED",
        jobData.payload,
        jobData.signature
      );
    });

    it("should throw an error if buyerId is missing", async () => {
      const invalidJobData = { ...jobData, buyerId: null };
      job.data = invalidJobData;

      await expect(webhookWorker.handleSendWebhook(job)).rejects.toThrow(
        "Buyer ID is required to send webhook."
      );

      expect(customLoggerMock.error).toHaveBeenCalledWith(
        `Failed to send webhook to ${jobData.webhookUrl}: Error: Buyer ID is required to send webhook.`
      );
    });
  });
});
