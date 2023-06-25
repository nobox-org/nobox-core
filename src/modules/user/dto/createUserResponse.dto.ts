import { ApiProperty } from '@nestjs/swagger';
export class CreateUserResponseDto {
   @ApiProperty()
   token: string;

   userDetails: any;

   @ApiProperty()
   success: boolean;
}
