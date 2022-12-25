import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { isPasswordValid } from '@/utils/custom-class-validators';
export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @isPasswordValid()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  shortCode: string;
}