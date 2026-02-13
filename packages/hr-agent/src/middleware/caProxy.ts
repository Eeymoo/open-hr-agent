import type { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { DOCKER_CONFIG } from '../config/docker.js';
import { getOptionalEnvValue } from '../utils/envSecrets.js';
import { getPrismaClient } from '../utils/database.js';
import { getContainerByName } from '../utils/docker/getContainer.js';

const CA_PROXY_PATH = '/ca';
const HTTP_OK = 200;
const HTTP_BAD_GATEWAY = 502;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;
const PROXY_TIMEOUT_MS = 30000;

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

    return ca.caName;
  } catch {
    return null;
  }
}

function handleProxyResponse(proxyRes: http.IncomingMessage, res: Response, caName: string): void {
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
    res.status(HTTP_NOT_FOUND).json({
      code: HTTP_NOT_FOUND,
      message: `CA "${caName}" not found in database`
    });
    return;
  }

  const dockerContainer = await getContainerByName(containerName);

  if (!dockerContainer) {
    res.status(HTTP_NOT_FOUND).json({
      code: HTTP_NOT_FOUND,
      message: `Docker container "${containerName}" not found. Please ensure the CA container is created.`
    });
    return;
  }

  if (!dockerContainer.state) {
    res.status(HTTP_SERVICE_UNAVAILABLE).json({
      code: HTTP_SERVICE_UNAVAILABLE,
      message: `CA container "${containerName}" is not running (status: ${dockerContainer.status}). Please start the container.`
    });
    return;
  }

  const targetUrl = `http://${containerName}:${DOCKER_CONFIG.PORT}`;

  const proxyReq = http.request(
    targetUrl + subPath,
    {
      method: req.method,
      timeout: PROXY_TIMEOUT_MS,
      headers: {
        ...req.headers,
        host: `${containerName}:${DOCKER_CONFIG.PORT}`,
        'x-forwarded-host': req.get('host'),
        'x-forwarded-proto': req.protocol
      }
    },
    (proxyRes) => handleProxyResponse(proxyRes, res, caName)
  );

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for ${originalUrl}:`, err.message);
    res.status(HTTP_BAD_GATEWAY).json({
      code: HTTP_BAD_GATEWAY,
      message: `Failed to proxy to CA container "${containerName}": ${err.message}`
    });
  });

  proxyReq.on('timeout', () => {
    console.error(`Proxy timeout for ${originalUrl}`);
    proxyReq.destroy();
    res.status(HTTP_BAD_GATEWAY).json({
      code: HTTP_BAD_GATEWAY,
      message: `Proxy request to CA container "${containerName}" timed out after ${PROXY_TIMEOUT_MS}ms`
    });
  });

  req.pipe(proxyReq);
}

export default caProxyMiddleware;
export { CA_PROXY_PATH };
