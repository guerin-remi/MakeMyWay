import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'backend/',
        'tests/',
        '*.config.js',
        'assets/js/debug-tools.js'
      ]
    },
    setupFiles: ['./tests/setup.js'],
    testMatch: ['**/tests/**/*.test.js'],
    mockReset: true,
    restoreMocks: true
  }
});