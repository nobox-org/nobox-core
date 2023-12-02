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
   callback_client?:string
}