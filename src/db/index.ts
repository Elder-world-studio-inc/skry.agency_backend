import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.skry from the project root or skry-backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env.skry') });

const pool = new Pool({
    connectionString: process.env.SKRY_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
