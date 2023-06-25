import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
export class UserExistsDto {
    @ApiProperty()
    @IsOptional()
    phoneNumber?: string;

    @ApiProperty()
    @IsOptional()
    email?: string;
}