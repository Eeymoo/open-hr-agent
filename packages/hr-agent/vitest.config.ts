import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      enabled: process.env.COVERAGE === 'true',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        lines: 34,
        functions: 42,
        branches: 25,
        statements: 34
      }
    }
  }
});
