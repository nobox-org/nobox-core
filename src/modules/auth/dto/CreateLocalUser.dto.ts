import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { isPasswordValid } from '@/utils/custom-class-validators';

export class CreateLocalUserDto {
   @ApiProperty()
   @IsNotEmpty()
   @IsString()
   firstName: string;

   @ApiProperty()
   @IsNotEmpty()
   @IsString()
   lastName: string;

   @ApiProperty()
   @IsNotEmpty()
   @IsString()
   @IsEmail()
   email: string;

   @ApiProperty()
   @IsNotEmpty()
   @isPasswordValid()
   password: string;
}
