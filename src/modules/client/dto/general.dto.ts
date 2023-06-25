import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class IdQueryDto {
   @ApiProperty()
   @IsNotEmpty()
   id: string;
}

export class RecordSpaceSlugParamDto {
   @ApiProperty()
   @IsNotEmpty()
   recordSpaceSlug: string;

   @ApiProperty()
   @IsNotEmpty()
   projectSlug: string;
}
