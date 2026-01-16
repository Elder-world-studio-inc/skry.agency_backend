import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { AuthFactory } from '../services/auth/factory';
import { JWTAuthService } from '../services/auth/JWTAuthService';

const router = express.Router();
const authService = AuthFactory.getAuthService() as JWTAuthService;

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
            'INSERT INTO skry_ad_cam.users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
            [email, passwordHash, fullName]
        );

        const user = result.rows[0];
        const token = await authService.generateToken({
            id: user.id,
            email: user.email,
            fullName: user.full_name
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name
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
            fullName: user.full_name
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name
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
import { authenticate } from '../middleware/auth';
router.get('/me', authenticate, async (req: Request, res: Response) => {
    res.json({ user: (req as any).user });
});

export default router;
