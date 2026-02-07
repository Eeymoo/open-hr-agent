import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import toonMiddleware from './middleware/responseFormat/toonMiddleware.js';
import autoLoadRoutes from './middleware/autoLoadRoutes.js';
import caProxyMiddleware from './middleware/caProxy.js';

dotenv.config();

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTES_DIR = join(__dirname, 'routes');

app.use(express.json());
app.use(toonMiddleware);

await autoLoadRoutes(app, ROUTES_DIR);

app.use(caProxyMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
