import { PricePlan } from "nobox-shared-lib";

export interface AuthResponse {
   token?: string;
}

export interface AuthCheckInput {
   token: string;
}

export interface LoginInput {
   password: string;

   email: string;
}

export interface AuthCheckResponse {
   expired: boolean;
   userNotFound?: boolean;
   invalid?: boolean;
}


export type CustomCallback = {
   callback_url?: string,
   callback_client?: string
}

export type AuthPayload = {
   from: string;
   pricePlan?: PricePlan;
}