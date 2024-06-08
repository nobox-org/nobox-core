import { IsEmail, IsNotEmpty, IsString } from "class-validator"

export class SendMailDto {
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    to: string;
    
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    from: string;

    @IsNotEmpty()
    @IsString()
    subject: string;
    
    @IsNotEmpty()
    @IsString()
    text: string;

    @IsNotEmpty()
    @IsString()
    html: string;
}