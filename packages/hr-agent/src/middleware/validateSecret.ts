import type { Request, Response, NextFunction } from 'express';
import Result from '../utils/Result.js';

const HTTP = {
  UNAUTHORIZED: 401
};

const SECRET_HEADER = 'x-secret';
const EXPECTED_SECRET = process.env.HRA_SECRET ?? 'hr-agent-secret';

const SKIP_AUTH_PATHS = ['/v1/webhooks', '/v1/ca'];

function shouldSkipAuth(path: string): boolean {
  return SKIP_AUTH_PATHS.some((skipPath) => path.startsWith(skipPath));
}

function validateSecretMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkipAuth(req.path)) {
    next();
    return;
  }

  const clientSecret = req.headers[SECRET_HEADER] as string;

  if (!clientSecret || clientSecret !== EXPECTED_SECRET) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'SECRET 错误'));
    return;
  }

  next();
}

export default validateSecretMiddleware;
