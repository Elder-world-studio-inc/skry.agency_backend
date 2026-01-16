import express, { Request, Response } from 'express';
import { authenticate } from '../core/middleware/auth';
import { StripeService } from '../core/services/payment/StripeService';

const router = express.Router();
const stripeService = new StripeService();

/**
 * @swagger
 * /api/payments/create-checkout-session:
 *   post:
 *     summary: Create a Stripe checkout session for shards
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created
 */
router.post('/create-checkout-session', authenticate, async (req: Request, res: Response) => {
    try {
        const { priceId, successUrl, cancelUrl } = req.body;
        const userId = (req as any).user.id;

        if (!priceId) {
            return res.status(400).json({ error: 'priceId is required' });
        }

        const session = await stripeService.createCheckoutSession(
            userId,
            priceId,
            successUrl || `${process.env.FRONTEND_URL}/dashboard?payment=success`,
            cancelUrl || `${process.env.FRONTEND_URL}/dashboard?payment=cancel`
        );

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('[Payments] Create Session Error:', error);
        if (error.message === 'BUNDLE_ALREADY_PURCHASED') {
            return res.status(400).json({ error: 'You have already purchased this bundle.', code: 'BUNDLE_ALREADY_PURCHASED' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe Webhook endpoint
 *     tags: [Payments]
 */
router.post('/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).send('Missing stripe-signature');
    }

    try {
        await stripeService.handleWebhook(req.body, sig as string);
        res.json({ received: true });
    } catch (error: any) {
        console.error('[Payments] Webhook Error:', error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

export default router;
