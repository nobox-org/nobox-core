import { Gender } from '@/types';

export class RegisterUserInput {
   firstName: string;

   lastName: string;

   email: string;

   password: string;

   gender?: Gender;

   picture: string;
}

export class GetUserInput {
   _id?: string;

   email?: string;
}
