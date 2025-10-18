import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/api/**/*.test.ts'],
    setupFiles: ['./tests/api/setup/global.ts'],
  },
});
