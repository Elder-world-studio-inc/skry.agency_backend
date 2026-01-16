import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../db';
import OpenAI from 'openai';
import { HostingerStorageService } from '../services/storage/HostingerStorageService';

const router = express.Router();
const storage = new HostingerStorageService();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * @swagger
 * /api/ads/analyze:
 *   post:
 *     summary: Analyze an ad image and extract metadata
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 encoded image data
 *               platform:
 *                 type: string
 *                 example: facebook
 *               format:
 *                 type: string
 *                 example: video
 *               hook_type:
 *                 type: string
 *               visual_style:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis complete
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/analyze', authenticate, async (req: Request, res: Response) => {
    try {
        const { image, platform, format, hook_type, visual_style } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // 1. Upload to Storage (Hostinger)
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const uploadResult = await storage.uploadFile(buffer, `ad-capture-${Date.now()}.jpg`, 'image/jpeg');

        // 2. Analyze with OpenAI (Refined for Skry)
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert digital ad analyst. Analyze the provided ad and extract classification data."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract the following from this ad: 1. Hook description 2. Primary selling point 3. Visual style details 4. Suggested improvements. Return as JSON." },
                        { type: "image_url", image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');

        // 3. Save to dedicated Skry Database
        const result = await query(
            `INSERT INTO skry_ad_cam.ad_scans 
            (user_id, image_url, platform, format, hook_type, visual_style, analysis_result) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [
                (req as any).user.id,
                uploadResult.url,
                platform || 'Unknown',
                format || 'Unknown',
                hook_type || 'Unknown',
                visual_style || 'Unknown',
                analysis
            ]
        );

        res.json({
            message: 'Analysis complete',
            data: result.rows[0]
        });

    } catch (error: any) {
        console.error('[Ads] Analysis Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/ads/history
 * @desc Get user's ad capture history
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await query(
            'SELECT * FROM skry_ad_cam.ad_scans WHERE user_id = $1 ORDER BY created_at DESC',
            [(req as any).user.id]
        );
        res.json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
