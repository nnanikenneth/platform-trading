import { Module } from "@nestjs/common";
import { BuyersController } from "./buyers.controller";
import { BuyersService } from "./buyers.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { PrismaModule } from "@src/database/prisma.module";
import { CustomLoggerService } from "@src/common/services/logger.service";

@Module({
  imports: [PrismaModule],
  controllers: [BuyersController],
  providers: [BuyersService, JwtAuthGuard, CustomLoggerService],
  exports: [BuyersService],
})
export class BuyersModule {}
