import { IsNotEmpty } from 'class-validator';
import { BaseRecordSpaceSlugDto } from './base-record-space-slug.dto';

export class UpdateRecordDto extends BaseRecordSpaceSlugDto {
   @IsNotEmpty()
   id: string;
}
