import { IsNotEmpty } from 'class-validator';
import { IsValidAsAMongoObjectId } from '@/utils/custom-class-validators';

export class getUserDetailsDto {
   @IsNotEmpty()
   @IsValidAsAMongoObjectId()
   id: string;
}
