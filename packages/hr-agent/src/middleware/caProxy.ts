import { Request, Response } from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { DOCKER_CONFIG } from '../config/docker.js';

const CA_PROXY_PATH = '/ca';

function injectBaseTag(html: string, basePath: string): string {
  const baseTag = `<base href="${basePath}">`;
  const headPattern = /<head>/i;
  if (headPattern.test(html)) {
    return html.replace(headPattern, `<head>${baseTag}`);
  }
  return html;
}

function createCAProxyMiddleware() {
  return createProxyMiddleware({
    target: `http://localhost:${DOCKER_CONFIG.PORT}`,
    changeOrigin: false,
    pathRewrite: (path: string, req: Request) => {
      const match = path.match(new RegExp(`^${CA_PROXY_PATH}/([^/]+)/?(.*)$`));
      if (match) {
        const caName = `ca-${match[1]}`;
        const subPath = match[2] || '/';
        req.url = subPath;
        return subPath;
      }
      return path;
    },
    router: (req: Request) => {
      const match = req.originalUrl.match(new RegExp(`^${CA_PROXY_PATH}/([^/]+)/`));
      if (match) {
        return `http://ca-${match[1]}:${DOCKER_CONFIG.PORT}`;
      }
      return `http://localhost:${DOCKER_CONFIG.PORT}`;
    },
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(async (buffer, proxyRes, req, res) => {
      const contentType = proxyRes.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        const html = buffer.toString('utf8');
        const match = req.originalUrl.match(new RegExp(`^${CA_PROXY_PATH}/([^/]+)/`));
        if (match) {
          const basePath = `${CA_PROXY_PATH}/${match[1]}/`;
          const modifiedHtml = injectBaseTag(html, basePath);
          return modifiedHtml;
        }
      }
      return buffer;
    }),
    onError: (err, req: Request, res: Response) => {
      console.error(`Proxy error for ${req.originalUrl}:`, err.message);
      res.status(502).json({
        code: 502,
        message: `Failed to proxy to CA container: ${err.message}`
      });
    }
  });
}

export default createCAProxyMiddleware;
export { CA_PROXY_PATH };
