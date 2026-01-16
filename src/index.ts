import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import adRoutes from './routes/ads';
import authRoutes from './routes/auth';
import { setupSwagger } from './utils/swagger';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.skry');
dotenv.config({ path: envPath });
// Also try loading standard .env if .env.skry doesn't exist
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// Swagger Documentation
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ads', adRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Skry Ad Cam Backend' });
});

app.listen(PORT, () => {
    console.log(`
🚀 Skry Ad Cam Backend Running
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
    `);
});
