import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/** Must match keys read in src/lib/ai-service.ts (Vite inlines static `process.env.*` only). */
const AI_KEY_PREFIXES = ['GEMINI_API_KEY', 'GROK_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY'] as const;

function buildAiKeyDefine(env: Record<string, string>) {
  const define: Record<string, string> = {};
  for (const base of AI_KEY_PREFIXES) {
    define[`process.env.${base}`] = JSON.stringify(env[base] ?? process.env[base] ?? '');
    for (let i = 1; i <= 10; i++) {
      const key = `${base}_${i}`;
      define[`process.env.${key}`] = JSON.stringify(env[key] ?? process.env[key] ?? '');
    }
  }
  return define;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: buildAiKeyDefine(env),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
