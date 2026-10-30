import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Le tableau de bord tourne sur le serveur de dev Vite ; /ws est relayé vers le WebSocket du hub,
 * le navigateur n'a donc aucune URL à connaître. Ports lus dans l'environnement (.env compris).
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'PULSEHUB_'), ...process.env };
  const wsPort = env.PULSEHUB_WS_PORT || '8080';

  return {
    root: 'web',
    plugins: [react()],
    server: {
      port: Number(env.PULSEHUB_DASHBOARD_PORT || 5173),
      proxy: { '/ws': { target: `ws://localhost:${wsPort}`, ws: true } },
    },
    preview: {
      port: Number(env.PULSEHUB_DASHBOARD_PORT || 5173),
      proxy: { '/ws': { target: `ws://localhost:${wsPort}`, ws: true } },
    },
    build: { outDir: '../dist/web', emptyOutDir: true },
  };
});
