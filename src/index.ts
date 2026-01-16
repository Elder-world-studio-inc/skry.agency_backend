import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import { loadModules, getModulesMetadata } from './core/modules';
import { setupSwagger } from './utils/swagger';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.skry');
dotenv.config({ path: envPath });
// Also try loading standard .env if .env.skry doesn't exist
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const apiRouter = express.Router();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Stripe Webhook needs raw body, must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));

// Swagger Documentation
setupSwagger(app);

// API Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/payments', paymentRoutes);

// Load Modules
loadModules(apiRouter);

// Module Discovery
apiRouter.get('/modules', (req, res) => {
    res.json(getModulesMetadata());
});

app.use('/api', apiRouter);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Skry Hub Backend' });
});

app.listen(PORT, () => {
    console.log(`
🚀 Skry Ad Cam Backend Running
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
    `);
});
