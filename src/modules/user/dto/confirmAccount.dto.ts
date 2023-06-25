import { IsNotEmpty } from 'class-validator';

export class ConfirmAccountParamDto {
   @IsNotEmpty()
   token: string;
}

export class ConfirmAccountBodyDto {
   @IsNotEmpty()
   email: string;
}

export interface ConfirmAccountResponseDto {
   success?: boolean;
   userConfirmedAlready?: boolean;
}
