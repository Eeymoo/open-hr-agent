import type { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { DOCKER_CONFIG } from '../config/docker.js';

const CA_PROXY_PATH = '/ca';
const HTTP_OK = 200;
const HTTP_BAD_GATEWAY = 502;

function injectBaseTag(html: string, basePath: string): string {
  const baseTag = `<base href="${basePath}">`;
  const headPattern = /<head>/i;
  if (headPattern.test(html)) {
    return html.replace(headPattern, `<head>${baseTag}`);
  }
  return html;
}

function caProxyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalUrl = req.originalUrl ?? req.url;
  const match = originalUrl.match(new RegExp(`^${CA_PROXY_PATH}/([^/]+)(.*)$`));

  if (!match) {
    next();
    return;
  }

  const [caName, subPath = '/'] = [match[1], match[2]];
  const targetUrl = `http://ca-${caName}:${DOCKER_CONFIG.PORT}`;

  const proxyReq = http.request(targetUrl + subPath, (proxyRes) => {
    const chunks: Buffer[] = [];

    proxyRes.on('data', (chunk) => {
      chunks.push(chunk);
    });

    proxyRes.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = proxyRes.headers['content-type'];

      res.status(proxyRes.statusCode ?? HTTP_OK);

      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value) {
          res.setHeader(key, value);
        }
      });

      if (contentType && contentType.includes('text/html')) {
        const html = buffer.toString('utf8');
        const basePath = `${CA_PROXY_PATH}/${caName}/`;
        const modifiedHtml = injectBaseTag(html, basePath);
        res.send(modifiedHtml);
      } else {
        res.send(buffer);
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for ${originalUrl}:`, err.message);
    res.status(HTTP_BAD_GATEWAY).json({
      code: HTTP_BAD_GATEWAY,
      message: `Failed to proxy to CA container: ${err.message}`
    });
  });

  req.pipe(proxyReq);
}

export default caProxyMiddleware;
export { CA_PROXY_PATH };
