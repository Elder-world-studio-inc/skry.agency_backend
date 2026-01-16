import Stripe from 'stripe';
import { query, getClient } from '../../db';
import { ShardService } from '../shard/ShardService';

export class StripeService {
    private stripe: Stripe;
    private shardService: ShardService;

    constructor() {
        const apiKey = process.env.STRIPE_SECRET_KEY || '';
        this.stripe = new Stripe(apiKey, {
            apiVersion: '2025-01-27.acacia' as any,
        });
        this.shardService = new ShardService();
    }

    async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
        // 1. Verify product exists in our DB
        const productResult = await query(
            'SELECT * FROM skry_ad_cam.products WHERE stripe_price_id = $1 AND is_active = TRUE',
            [priceId]
        );

        if (productResult.rows.length === 0) {
            throw new Error('Product not found or inactive');
        }

        const product = productResult.rows[0];

        // 2. Check for duplicate purchase if it's the specific bundle
        if (priceId === 'price_1Sq3oLLDdp4BWCnX2aTO3Hth') {
            const purchaseCheck = await query(
                'SELECT id FROM skry_ad_cam.user_purchases WHERE user_id = $1 AND product_id = $2',
                [userId, product.id]
            );
            if (purchaseCheck.rows.length > 0) {
                throw new Error('BUNDLE_ALREADY_PURCHASED');
            }
        }

        // 3. Create Stripe session
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                priceId,
                productId: product.id,
                shardsCount: product.shards_count.toString(),
            },
        });

        return session;
    }

    async handleWebhook(payload: string | Buffer, sig: string) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, sig, webhookSecret);
        } catch (err: any) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.processSuccessfulCheckout(session);
        }

        return { received: true };
    }

    private async processSuccessfulCheckout(session: Stripe.Checkout.Session) {
        const { userId, productId, shardsCount, priceId } = session.metadata || {};

        if (!userId || !productId || !shardsCount) {
            console.error('[StripeService] Missing metadata in session:', session.id);
            return;
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Record purchase (to prevent duplicates)
            await client.query(
                `INSERT INTO skry_ad_cam.user_purchases (user_id, product_id, stripe_session_id) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (stripe_session_id) DO NOTHING`,
                [userId, productId, session.id]
            );

            // 2. Add shards
            const amount = parseInt(shardsCount);
            await this.shardService.addShards(
                userId, 
                amount, 
                'PURCHASE', 
                `Purchase of ${amount} shards`, 
                session.id
            );

            await client.query('COMMIT');
            console.log(`[StripeService] Successfully processed purchase for user ${userId}: ${shardsCount} shards`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[StripeService] Error processing successful checkout:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}
