import { IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
   @IsNotEmpty()
   phoneNumber: string;
}

export interface ForgotPasswordResponseDto {
   success: boolean;
   message: string;
}
