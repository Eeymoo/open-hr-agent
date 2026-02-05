import { readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import type { Router, RequestHandler } from 'express';

const IS_TSX =
  process.argv[1]?.includes('tsx') || process.execArgv.some((arg) => arg.includes('tsx'));

function convertNextRouteName(name: string): string {
  return name.replace(/^\[(.+)\]$/, ':$1');
}

function buildExpressPath(basePath: string, routePath: string): string {
  return basePath ? `/${basePath}/${routePath}` : `/${routePath}`;
}

function parseRouteFileName(fileName: string): { routeName: string; method: string } {
  const methodMatch = fileName.match(/\.(post|put|delete|patch|get)\.ts$/i);
  if (methodMatch) {
    const method = methodMatch[1].toLowerCase();
    const routeName = fileName.slice(0, methodMatch.index);
    return { routeName, method };
  }
  const routeName = fileName.replace(/\.ts$/, '');
  return { routeName, method: 'get' };
}

function registerRoute(
  router: Router,
  method: string,
  path: string,
  handler: RequestHandler
): void {
  switch (method) {
    case 'post':
      router.post(path, handler);
      break;
    case 'put':
      router.put(path, handler);
      break;
    case 'delete':
      router.delete(path, handler);
      break;
    case 'patch':
      router.patch(path, handler);
      break;
    case 'get':
    default:
      router.get(path, handler);
      break;
  }

  console.log(`Route registered: ${method.toUpperCase()} ${path}`);
}

export { parseRouteFileName };

export default async function autoLoadRoutes(
  router: Router,
  routesDir: string,
  basePath = ''
): Promise<void> {
  const items = readdirSync(routesDir);

  for (const item of items) {
    const fullPath = join(routesDir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(router, item, fullPath, basePath);
    } else if (stat.isFile()) {
      const isTsFile = item.endsWith('.ts') && item !== 'index.ts' && !item.endsWith('.d.ts');
      const isJsFile =
        item.endsWith('.js') &&
        item !== 'index.js' &&
        !item.endsWith('.d.js') &&
        !item.endsWith('.map');
      if (isTsFile || isJsFile) {
        await processFile(router, item, fullPath, basePath);
      }
    }
  }
}

async function processDirectory(
  router: Router,
  item: string,
  fullPath: string,
  basePath: string
): Promise<void> {
  const routePath = convertNextRouteName(item);
  const newBasePath = basePath ? `${basePath}/${routePath}` : routePath;
  const indexTsPath = join(fullPath, 'index.ts');

  try {
    statSync(indexTsPath);
    const indexModule = await import(IS_TSX ? indexTsPath : `${indexTsPath}.js`);
    const defaultExport = indexModule.default;

    if (typeof defaultExport === 'function') {
      const expressPath = `/${newBasePath}`;
      registerRoute(router, 'get', expressPath, defaultExport);
    }
  } catch {
    await autoLoadRoutes(router, fullPath, newBasePath);
  }
}

async function processFile(
  router: Router,
  item: string,
  fullPath: string,
  basePath: string
): Promise<void> {
  const { routeName, method } = parseRouteFileName(item);
  let modulePath: string;
  if (IS_TSX) {
    modulePath = fullPath;
  } else if (item.endsWith('.ts')) {
    modulePath = `${fullPath.slice(0, -3)}.js`;
  } else {
    modulePath = fullPath;
  }
  const routeModule = await import(modulePath);
  const defaultExport = routeModule.default;

  if (typeof defaultExport === 'function') {
    const routePath = convertNextRouteName(routeName);
    const expressPath = buildExpressPath(basePath, routePath);
    registerRoute(router, method, expressPath, defaultExport);
  }
}
