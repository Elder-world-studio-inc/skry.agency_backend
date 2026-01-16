import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../core/db';
import { AuthFactory } from '../core/services/auth/factory';
import { JWTAuthService } from '../core/services/auth/JWTAuthService';
import { GoogleAuthService } from '../core/services/auth/GoogleAuthService';
import { ShardService } from '../core/services/shard/ShardService';

const router = express.Router();
const authService = AuthFactory.getAuthService() as JWTAuthService;
const googleAuthService = new GoogleAuthService();
const shardService = new ShardService();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user exists
        const userCheck = await query('SELECT id FROM skry_ad_cam.users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            'INSERT INTO skry_ad_cam.users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, module_permissions',
            [email, passwordHash, fullName]
        );

        const user = result.rows[0];

        // Log initial allocation
        await shardService.addShards(user.id, 125, 'INITIAL_ALLOCATION', 'Welcome gift: 5 free scans');

        const token = await authService.generateToken({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            module_permissions: user.module_permissions
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                module_permissions: user.module_permissions
            },
            token
        });
    } catch (error: any) {
        console.error('[Auth] Registration Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await query(
            'SELECT * FROM skry_ad_cam.users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = await authService.generateToken({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            module_permissions: user.module_permissions
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                module_permissions: user.module_permissions
            },
            token
        });
    } catch (error: any) {
        console.error('[Auth] Login Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 */
import { authenticate } from '../core/middleware/auth';
router.get('/me', authenticate, async (req: Request, res: Response) => {
    res.json({ user: (req as any).user });
});

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth Sign-In/Sign-Up
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/google', async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'idToken is required' });
        }

        const googleUser = await googleAuthService.verifyToken(idToken);
        if (!googleUser) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        // Check if user exists by google_id or email
        let result = await query(
            'SELECT * FROM skry_ad_cam.users WHERE google_id = $1 OR email = $2',
            [googleUser.googleId, googleUser.email]
        );

        let user;
        if (result.rows.length === 0) {
            // Create new user
            const insertResult = await query(
                `INSERT INTO skry_ad_cam.users (email, google_id, full_name, shard_balance) 
                 VALUES ($1, $2, $3, 125) 
                 RETURNING *`,
                [googleUser.email, googleUser.googleId, googleUser.name]
            );
            user = insertResult.rows[0];
            
            // Log initial allocation
            await shardService.addShards(user.id, 125, 'INITIAL_ALLOCATION', 'Welcome gift: 5 free scans');
        } else {
            user = result.rows[0];
            // Update google_id if it was null (linking account)
            if (!user.google_id) {
                await query(
                    'UPDATE skry_ad_cam.users SET google_id = $1 WHERE id = $2',
                    [googleUser.googleId, user.id]
                );
            }
        }

        const token = await authService.generateToken({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            module_permissions: user.module_permissions
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                module_permissions: user.module_permissions,
                shardBalance: user.shard_balance
            },
            token
        });
    } catch (error: any) {
        console.error('[Auth] Google Login Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
