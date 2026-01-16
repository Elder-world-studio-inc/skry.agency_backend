import { query, getClient } from '../../db';

export interface ShardTransaction {
    id: string;
    userId: string;
    amount: number;
    type: 'PURCHASE' | 'USAGE' | 'INITIAL_ALLOCATION';
    description?: string;
    stripeSessionId?: string;
    createdAt: Date;
}

export class ShardService {
    /**
     * Get the current shard balance for a user
     */
    async getBalance(userId: string): Promise<number> {
        const result = await query(
            'SELECT shard_balance FROM skry_ad_cam.users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        return result.rows[0].shard_balance;
    }

    /**
     * Deduct shards from a user's balance
     */
    async deductShards(userId: string, amount: number, description: string): Promise<number> {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            
            const balanceResult = await client.query(
                'SELECT shard_balance FROM skry_ad_cam.users WHERE id = $1 FOR UPDATE',
                [userId]
            );

            if (balanceResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const currentBalance = balanceResult.rows[0].shard_balance;
            if (currentBalance < amount) {
                throw new Error('INSUFFICIENT_FUNDS');
            }

            const newBalance = currentBalance - amount;
            await client.query(
                'UPDATE skry_ad_cam.users SET shard_balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            await client.query(
                `INSERT INTO skry_ad_cam.shard_transactions (user_id, amount, type, description) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, -amount, 'USAGE', description]
            );

            await client.query('COMMIT');
            return newBalance;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Add shards to a user's balance (e.g., from a purchase)
     */
    async addShards(userId: string, amount: number, type: 'PURCHASE' | 'INITIAL_ALLOCATION', description: string, stripeSessionId?: string): Promise<number> {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            const balanceResult = await client.query(
                'SELECT shard_balance FROM skry_ad_cam.users WHERE id = $1 FOR UPDATE',
                [userId]
            );

            if (balanceResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const currentBalance = balanceResult.rows[0].shard_balance;
            const newBalance = currentBalance + amount;

            await client.query(
                'UPDATE skry_ad_cam.users SET shard_balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            await client.query(
                `INSERT INTO skry_ad_cam.shard_transactions (user_id, amount, type, description, stripe_session_id) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, amount, type, description, stripeSessionId]
            );

            await client.query('COMMIT');
            return newBalance;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get transaction history for a user
     */
    async getTransactionHistory(userId: string): Promise<ShardTransaction[]> {
        const result = await query(
            'SELECT * FROM skry_ad_cam.shard_transactions WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            amount: row.amount,
            type: row.type,
            description: row.description,
            stripeSessionId: row.stripe_session_id,
            createdAt: row.created_at
        }));
    }
}
