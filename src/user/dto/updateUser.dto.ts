import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IsValidAsAMongoObjectId } from 'src/utils/custom-class-validators';

class Address {
  @IsNotEmpty()
  number: string;

  @IsNotEmpty()
  street: string;

  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  country: string;
}

export class BankDetails {
  @IsNotEmpty()
  bankCode: string;

  @IsNotEmpty()
  accountNumber: string;

  @IsNotEmpty()
  accountName: string;
}

export class UpdateUserDto {
  @Type(() => Address)
  @ValidateNested()
  @IsOptional()
  address: Address;

  @Type(() => BankDetails)
  @ValidateNested()
  @IsOptional()
  bankDetails: BankDetails;
}

export class IdDto {
  @IsNotEmpty()
  @IsValidAsAMongoObjectId()
  id: string;
}

export class BufferedFileDto {
  @IsNotEmpty()
  @IsString()
  fieldname: string;

  @IsNotEmpty()
  originalname: string;

  encoding: string;

  mimetype: AppMimeType;

  size: number;

  @IsNotEmpty()
  buffer: Buffer | string;
}

export type AppMimeType = 'image/png' | 'image/jpeg';


