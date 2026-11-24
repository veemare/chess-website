import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest, type StoreAdapter } from './server/apiCore';

const STORE_FILE = path.resolve(process.cwd(), '.data/vesper64-store.json');
let writeChain = Promise.resolve();

function createLocalFileStore(): StoreAdapter {
  async function readAll(): Promise<Record<string, unknown>> {
    try {
      const raw = await fs.readFile(STORE_FILE, 'utf8');
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return {
    async getJson<T>(key: string): Promise<T | null> {
      const all = await readAll();
      return (all[key] as T) ?? null;
    },
    async setJson<T>(key: string, value: T): Promise<void> {
      const next = writeChain.then(async () => {
        await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
        const all = await readAll();
        all[key] = value;
        await fs.writeFile(STORE_FILE, JSON.stringify(all, null, 2), 'utf8');
      });
      writeChain = next.catch(() => undefined);
      await next;
    },
  };
}

function readNodeBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createApiMiddleware() {
  const store = createLocalFileStore();
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const urlStr = req.url || '/';
    if (!urlStr.startsWith('/api')) {
      next();
      return;
    }

    try {
      const parsed = new URL(urlStr, 'http://localhost');
      const apiPath = parsed.pathname.replace(/^\/api/, '') || '/';
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k.toLowerCase()] = Array.isArray(v) ? v.join('; ') : v;
      }

      const method = (req.method || 'GET').toUpperCase();
      const bodyText = method === 'GET' || method === 'HEAD' ? '' : await readNodeBody(req);

      const apiRes = await handleApiRequest(
        {
          method,
          path: apiPath,
          query: parsed.searchParams,
          headers,
          bodyText,
          isHttps: false,
        },
        store
      );

      res.statusCode = apiRes.status;
      for (const [k, v] of Object.entries(apiRes.headers)) {
        res.setHeader(k, v);
      }
      res.end(apiRes.body);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
    }
  };
}

function localApiPlugin(): Plugin {
  const middleware = createApiMiddleware();
  return {
    name: 'vesper64-local-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
