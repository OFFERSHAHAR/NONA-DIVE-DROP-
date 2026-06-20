import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__/**/*.test.ts'],
    exclude: ['src/**/*.e2e.test.ts', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json', 'lcov'],
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/__tests__/**',
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
      // Coverage thresholds for critical paths
      thresholds: {
        // Global thresholds
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      // Per-file high thresholds for critical modules
      perFile: true,
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
