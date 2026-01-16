import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.skry from the project root or skry-backend directory
const envPath = path.resolve(__dirname, '../../.env.skry');
dotenv.config({ path: envPath });
dotenv.config();

const dbUrl = process.env.SKRY_DATABASE_URL;

if (!dbUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ SKRY_DATABASE_URL is not defined in production environment!');
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
