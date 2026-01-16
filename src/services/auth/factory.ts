import { IAuthService } from './types';
import { JWTAuthService } from './JWTAuthService';

export class AuthFactory {
    static getAuthService(): IAuthService {
        const provider = process.env.SKRY_AUTH_PROVIDER || 'jwt';

        switch (provider.toLowerCase()) {
            case 'jwt':
                return new JWTAuthService();
            // case 'supabase':
            //     return new SupabaseAuthService();
            default:
                return new JWTAuthService();
        }
    }
}
