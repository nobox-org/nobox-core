import { FunctionName } from '@/modules/client-functions/resources/types';
import { IsNotEmpty } from 'class-validator';

export class FunctionDto {
   @IsNotEmpty()
   functionName: FunctionName;

   @IsNotEmpty()
   projectSlug: string;
}
