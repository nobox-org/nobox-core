import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { NumBool, UserType } from '../../../types';

export class GetUserIdDto {
   @IsNotEmpty()
   id: string;
}

export class GetUserDto {
   @IsOptional()
   @IsEnum(UserType)
   type?: UserType;

   @IsOptional()
   @IsEnum(NumBool)
   approved?: NumBool;
}

export interface GetUserResponseDto {
   success: boolean;
}
