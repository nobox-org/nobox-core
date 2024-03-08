import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';

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


export class GetEmbeddingBodyDto {
   @ApiProperty()
   @IsNotEmpty()
   @IsArray()
   @ArrayMinSize(1)
   text: string[];
}