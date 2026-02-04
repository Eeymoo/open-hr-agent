import express, { type Router } from 'express';
import helloRoute from './routes/hello.js';
import agentsRoute from './routes/agents.js';
import errorRoute from './routes/error.js';

const router: Router = express.Router();

router.get('/hello', helloRoute);
router.get('/agents', agentsRoute);
router.get('/error', errorRoute);

export default router;
