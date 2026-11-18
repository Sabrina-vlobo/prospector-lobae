import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Variáveis falsas só pros testes: nenhum teste fala com banco ou Google de verdade.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:1/test",
      GOOGLE_PLACES_API_KEY: "test-key",
      GOOGLE_MONTHLY_CALL_LIMIT: "200",
      GOOGLE_MAX_PAGES_PER_SEARCH: "3",
    },
  },
});
