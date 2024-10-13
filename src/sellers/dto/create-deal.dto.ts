import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsPositive,
  Matches,
} from "class-validator";

enum DiscountType {
  FLAT = "FLAT",
  PERCENTAGE = "PERCENTAGE",
}

class DealItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: "Item name is required." })
  @Matches(/^[a-zA-Z0-9\s\-]+$/, {
    message: "Item name contains invalid characters.",
  })
  name: string;

  @IsPositive({ message: "Price must be a positive value." })
  price: number;

  @IsPositive({ message: "Quantity must be a positive value." })
  quantity: number;
}

class DiscountDto {
  @IsEnum(DiscountType, {
    message: 'Discount type must be either "FLAT" or "PERCENTAGE".',
  })
  @IsNotEmpty({ message: "Discount type is required." })
  type!: DiscountType;

  @IsPositive({ message: "Discount amount must be a positive value." })
  amount!: number;
}

export class CreateDealDto {
  @IsString()
  @IsNotEmpty({ message: "Deal name is required." })
  @Matches(/^[a-zA-Z0-9\s\-]+$/, {
    message: "Deal name contains invalid characters.",
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: "Description is required." })
  description: string;

  @IsString()
  @IsNotEmpty({ message: "Currency is required." })
  @Matches(/^[A-Z]{3}$/, { message: "Currency must be a valid 3-letter code." })
  currency: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @IsArray({ message: "Items must be an array." })
  @ValidateNested({ each: true })
  @Type(() => DealItemDto)
  @IsNotEmpty({ message: "At least one item is required." })
  items: DealItemDto[];
}
