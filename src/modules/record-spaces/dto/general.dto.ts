import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetRecordSpacesParamDto {
   @ApiProperty()
   @IsNotEmpty()
   projectSlug: string;

   @ApiProperty()
   @IsOptional()
   projectId?: string;
}
