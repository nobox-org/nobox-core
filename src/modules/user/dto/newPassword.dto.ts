import { IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
   @IsNotEmpty()
   newPassword: string;

   @IsNotEmpty()
   token: string;
}

export interface ResetPasswordResponseDto {
   success: boolean;
}
