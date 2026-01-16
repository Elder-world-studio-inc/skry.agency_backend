import jwt from 'jsonwebtoken';
import { IAuthService, SkryUser } from './types';

export class JWTAuthService implements IAuthService {
    private secret: string;

    constructor() {
        this.secret = process.env.SKRY_JWT_SECRET || 'fallback_secret';
    }

    async verifyToken(token: string): Promise<SkryUser | null> {
        try {
            const decoded = jwt.verify(token, this.secret) as any;
            return {
                id: decoded.id,
                email: decoded.email,
                fullName: decoded.fullName
            };
        } catch (error) {
            return null;
        }
    }

    async generateToken(user: SkryUser): Promise<string> {
        return jwt.sign(
            { id: user.id, email: user.email, fullName: user.fullName },
            this.secret,
            { expiresIn: '24h' }
        );
    }
}
