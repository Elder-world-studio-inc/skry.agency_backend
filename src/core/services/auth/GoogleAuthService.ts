import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
    private client: OAuth2Client;

    constructor() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.warn('⚠️ GOOGLE_CLIENT_ID is not defined!');
        }
        this.client = new OAuth2Client(clientId);
    }

    async verifyToken(idToken: string) {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload) return null;

            return {
                googleId: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
            };
        } catch (error) {
            console.error('[GoogleAuth] Token verification failed:', error);
            return null;
        }
    }
}
