import { IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { AuthorizationLevel } from '@prisma/client';

export class AuthorizationRequestDto {
  @IsBoolean()
  approve: boolean;

  @IsEnum(AuthorizationLevel)
  @IsOptional()
  authorizationLevel?: AuthorizationLevel;
}
