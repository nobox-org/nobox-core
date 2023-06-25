
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
}