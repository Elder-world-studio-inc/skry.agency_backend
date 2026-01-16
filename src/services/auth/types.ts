export interface SkryUser {
    id: string;
    email: string;
    fullName?: string;
}

export interface AuthResponse {
    user: SkryUser;
    token: string;
}

export interface IAuthService {
    verifyToken(token: string): Promise<SkryUser | null>;
    login?(credentials: any): Promise<AuthResponse>;
    register?(data: any): Promise<AuthResponse>;
    logout?(token: string): Promise<void>;
}
