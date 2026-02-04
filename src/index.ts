import process from 'node:process';
import express from 'express';
import toonMiddleware from './middleware/responseFormat/toonMiddleware.js';
import healthRoute from './routes/health.js';
import v1Router from './routes/v1/index.js';

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.use(express.json());
app.use(toonMiddleware);

app.get('/health', healthRoute);
app.use('/api/v1', v1Router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
