import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ResendShortCodeDto {

    @ApiProperty()
    @IsNotEmpty()
    email: string;
}