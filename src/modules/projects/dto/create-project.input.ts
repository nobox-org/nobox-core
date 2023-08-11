import { Transform } from 'class-transformer';

export class CreateProjectInput {
   description?: string;

   name: string;

   @Transform(({ value }) => value.toLowerCase())
   slug: string;
}
