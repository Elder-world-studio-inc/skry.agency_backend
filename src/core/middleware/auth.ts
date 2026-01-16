import { Request, Response, NextFunction } from 'express';
import { AuthFactory } from '../services/auth/factory';

const authService = AuthFactory.getAuthService();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const user = await authService.verifyToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        (req as any).user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
    }
};

export const authorizeModule = (moduleId: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: No user session' });
        }

        const permissions = user.module_permissions || [];
        
        if (!permissions.includes(moduleId) && !permissions.includes('*')) {
            return res.status(403).json({ 
                error: `Forbidden: You do not have access to the '${moduleId}' module` 
            });
        }

        next();
    };
};
