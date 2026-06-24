import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Pin tests to in-memory storage + no LLM so they're deterministic and
    // never touch the real database or call external APIs, regardless of .env.
    env: {
      MOCK_MODE: 'true',
      OPENAI_API_KEY: '',
    },
  },
});
