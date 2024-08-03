import { Gender } from '@/types';
import { PricePlan } from 'nobox-shared-lib';

export class RegisterUserInput {
   firstName: string;

   lastName: string;

   email: string;

   password: string;

   gender?: Gender;

   picture?: string;

   pricePlan?: PricePlan;
}

export class GetUserInput {
   _id?: string;

   email?: string;
}
