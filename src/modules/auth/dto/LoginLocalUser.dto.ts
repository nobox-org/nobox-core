import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginLocalUserDto {
   @ApiProperty()
   @IsNotEmpty()
   @IsString()
   @IsEmail()
   email: string;

   @ApiProperty()
   @IsNotEmpty()
   password: string;
}


export class SendOtpDto {
    @ApiProperty()
    @IsNotEmpty()
    email: string;
}

