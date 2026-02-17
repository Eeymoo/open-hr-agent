import { describe, it, expect } from 'vitest';
import express, { Router } from 'express';
import request from 'supertest';
import validateSecretMiddleware from './validateSecret.js';

function createTestApp(): express.Application {
  const app = express();
  app.use(express.json());
  return app;
}

function createV1Router(): Router {
  const v1Router = Router();
  v1Router.use(validateSecretMiddleware);
  return v1Router;
}

function createAppWithIssuesRoute(): express.Application {
  const app = createTestApp();
  const v1Router = createV1Router();
  v1Router.get('/issues', (_req, res) => {
    res.json({ issues: [] });
  });
  app.use('/v1', v1Router);
  return app;
}

describe('validateSecret Middleware - SKIP_AUTH_PATHS', () => {
  it('should skip authentication for /v1/webhooks/* paths', async () => {
    const app = createTestApp();
    const v1Router = createV1Router();
    v1Router.post('/webhooks/issues', (_req, res) => {
      res.json({ message: 'Webhook received' });
    });
    app.use('/v1', v1Router);

    const response = await request(app)
      .post('/v1/webhooks/issues')
      .send({ test: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Webhook received');
  });

  it('should skip authentication for /v1/ca/* paths', async () => {
    const app = createTestApp();
    const v1Router = createV1Router();
    v1Router.get('/ca/status', (_req, res) => {
      res.json({ status: 'ok' });
    });
    app.use('/v1', v1Router);

    const response = await request(app).get('/v1/ca/status');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should skip authentication for /v1/webhooks/pullRequests path', async () => {
    const app = createTestApp();
    const v1Router = createV1Router();
    v1Router.post('/webhooks/pullRequests', (_req, res) => {
      res.json({ message: 'PR webhook received' });
    });
    app.use('/v1', v1Router);

    const response = await request(app)
      .post('/v1/webhooks/pullRequests')
      .send({ test: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('PR webhook received');
  });
});

describe('validateSecret Middleware - Authentication required', () => {
  it('should return error when no secret is provided', async () => {
    const response = await request(createAppWithIssuesRoute()).get('/v1/issues');

    expect(response.body.code).toBe(401);
    expect(response.body.message).toBe('SECRET 错误');
  });

  it('should return error when invalid secret is provided', async () => {
    const response = await request(createAppWithIssuesRoute())
      .get('/v1/issues')
      .set('x-secret', 'wrong-secret');

    expect(response.body.code).toBe(401);
    expect(response.body.message).toBe('SECRET 错误');
  });

  it('should allow access when valid secret is provided', async () => {
    const response = await request(createAppWithIssuesRoute())
      .get('/v1/issues')
      .set('x-secret', 'hr-agent-secret');

    expect(response.status).toBe(200);
    expect(response.body.issues).toEqual([]);
  });
});
