import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsBoolean()
  publicAccess?: boolean;

  @IsEnum(Role, { message: 'Role must be either BUYER or SELLER' })
  role!: Role;
}
