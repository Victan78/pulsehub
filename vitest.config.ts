import { defineConfig } from 'vitest/config';

// Configuration séparée de vite.config.ts, dont la racine est le dossier web/.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
