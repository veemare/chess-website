import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { handleApiRequest, type StoreAdapter } from '../../server/apiCore.ts';

function createNetlifyStore(): StoreAdapter {
  const store = getStore('vesper64-data');
  return {
    async getJson<T>(key: string): Promise<T | null> {
      try {
        const data = await store.get(key, { type: 'json' });
        return (data as T) ?? null;
      } catch {
        return null;
      }
    },
    async setJson<T>(key: string, value: T): Promise<void> {
      await store.setJSON(key, value);
    },
  };
}

export default async function handler(req: Request, _context: Context): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '') || '/';

  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const bodyText =
    req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();

  const res = await handleApiRequest(
    {
      method: req.method,
      path,
      query: url.searchParams,
      headers,
      bodyText,
      isHttps: url.protocol === 'https:',
    },
    createNetlifyStore()
  );

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
