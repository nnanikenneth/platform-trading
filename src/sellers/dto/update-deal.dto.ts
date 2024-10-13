import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsPositive,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

enum DiscountType {
  FLAT = "FLAT",
  PERCENTAGE = "PERCENTAGE",
}

enum DealStatus {
  AVAILABLE = "AVAILABLE",
  SOLD = "SOLD",
}

class DealItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: "Item name is required." })
  name!: string;

  @IsNumber()
  @IsPositive({ message: "Price must be a positive value." })
  price!: number;

  @IsNumber()
  @Min(1, { message: "Quantity must be at least 1." })
  @Max(1000000, { message: "Quantity must be at most 1000000." })
  quantity!: number;
}

class DiscountDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(DiscountType, {
    message: 'Discount type must be either "FLAT" or "PERCENTAGE".',
  })
  @IsNotEmpty({ message: "Discount type is required." })
  type!: DiscountType;

  @IsNumber()
  @IsPositive({ message: "Discount amount must be a positive value." })
  amount!: number;
}

export class UpdateDealDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: "Deal name is required if provided." })
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive({ message: "Total price must be a positive value if provided." })
  total_price?: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: "Currency is required if provided." })
  currency?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @IsEnum(DealStatus, {
    message: 'Status must be either "AVAILABLE" or "SOLD".',
  })
  @IsOptional()
  status?: DealStatus;

  @IsArray({ message: "Items must be an array." })
  @ValidateNested({ each: true })
  @Type(() => DealItemDto)
  @IsOptional()
  items?: DealItemDto[];

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
