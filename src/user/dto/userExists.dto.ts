import { ApiProperty } from '@nestjs/swagger';
import { IsLowercase, IsOptional } from 'class-validator';
export class UserExistsDto {
    @ApiProperty()
    @IsOptional()
    phoneNumber?: string;

    @ApiProperty()
    @IsOptional()
    email?: string;
}