import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SuccessResponseDto {
   @ApiProperty()
   @IsNotEmpty()
   success: boolean;
}
