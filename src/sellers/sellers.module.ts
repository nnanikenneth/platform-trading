import { Module } from '@nestjs/common';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { PrismaModule } from '@src/database/prisma.module';
import { CustomLoggerService } from '@src/common/services/logger.service';
import { WebhookModule } from '@src/webhooks/webhook.module';
@Module({
  imports: [PrismaModule, WebhookModule],
  controllers: [SellersController],
  providers: [
    SellersService,
    CustomLoggerService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [SellersService],
})
export class SellersModule {}




