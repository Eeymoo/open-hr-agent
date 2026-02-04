import { readdirSync } from 'node:fs';
import { Router as createRouter, type Router } from 'express';

const router: Router = createRouter();

const ROUTES_DIR = import.meta.dirname;

const files = readdirSync(ROUTES_DIR);

for (const filename of files) {
  if (filename.endsWith('.ts') && filename !== 'index.ts') {
    const routeName = filename.replace('.ts', '');
    const modulePath = `./${routeName}.js`;
    const routeModule = await import(modulePath);
    const defaultExport = routeModule.default;

    if (typeof defaultExport === 'function') {
      router.get(`/${routeName}`, defaultExport);
    }
  }
}

export default router;
