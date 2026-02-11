import type { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { DOCKER_CONFIG } from '../config/docker.js';
import { getOptionalEnvValue } from '../utils/envSecrets.js';
import { getPrismaClient } from '../utils/database.js';

const CA_PROXY_PATH = '/ca';
const HTTP_OK = 200;
const HTTP_BAD_GATEWAY = 502;

const CSP_DOMAIN = getOptionalEnvValue('CSP_DOMAIN', 'http://rha.onemue.cn');

function injectBaseTag(html: string, basePath: string): string {
  const baseTag = `<base href="${basePath}">`;
  const headPattern = /<head>/i;
  if (headPattern.test(html)) {
    return html.replace(headPattern, `<head>${baseTag}`);
  }
  return html;
}

function modifySetCookie(cookies: string | string[], caName: string): string[] {
  const cookieArray = Array.isArray(cookies) ? cookies : cookies.split(',').map((c) => c.trim());
  return cookieArray.map((cookie) => {
    let modified = cookie;
    if (modified.includes('Domain=')) {
      modified = modified.replace(/Domain=[^;]+/i, 'Domain=');
    }
    if (modified.includes('Path=/') && !modified.includes('Path=/ca/')) {
      modified = modified.replace(/Path=\/[^;]*/i, `Path=/ca/${caName}/`);
    }
    return modified;
  });
}

async function getContainerNameByCAName(caName: string): Promise<string | null> {
  try {
    const prisma = getPrismaClient();
    const ca = await prisma.codingAgent.findFirst({
      where: {
        caName,
        deletedAt: -2
      },
      select: {
        caName: true
      }
    });

    if (!ca) {
      return null;
    }

    const containerName = `${DOCKER_CONFIG.NAME_PREFIX}${ca.caName}`;
    return containerName;
  } catch {
    return null;
  }
}

async function caProxyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const originalUrl = req.originalUrl ?? req.url;
  const match = originalUrl.match(new RegExp(`^${CA_PROXY_PATH}/([^/]+)(.*)$`));

  if (!match) {
    next();
    return;
  }

  const [caName, subPath = '/'] = [match[1], match[2]];

  const containerName = await getContainerNameByCAName(caName);

  if (!containerName) {
    res.status(HTTP_BAD_GATEWAY).json({
      code: HTTP_BAD_GATEWAY,
      message: `CA container for "${caName}" not found`
    });
    return;
  }

  const targetUrl = `http://${containerName}:${DOCKER_CONFIG.PORT}`;

  const proxyReq = http.request(
    targetUrl + subPath,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: `${containerName}:${DOCKER_CONFIG.PORT}`,
        'x-forwarded-host': req.get('host'),
        'x-forwarded-proto': req.protocol
      }
    },
    (proxyRes) => {
      const chunks: Buffer[] = [];

      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
      });

      proxyRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = proxyRes.headers['content-type'];

        res.status(proxyRes.statusCode ?? HTTP_OK);

        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (!value) {
            return;
          }

          if (key.toLowerCase() === 'set-cookie') {
            res.setHeader(key, modifySetCookie(value, caName));
          } else if (key.toLowerCase() === 'content-security-policy') {
            const csp = String(value).replace(
              /default-src [^;]+/gi,
              `default-src 'self' ${CSP_DOMAIN}`
            );
            res.setHeader(key, csp);
          } else {
            res.setHeader(key, value);
          }
        });

        if (contentType?.includes('text/html')) {
          const html = buffer.toString('utf8');
          const basePath = `${CA_PROXY_PATH}/${caName}/`;
          const modifiedHtml = injectBaseTag(html, basePath);
          res.send(modifiedHtml);
        } else {
          res.send(buffer);
        }
      });
    }
  );

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
