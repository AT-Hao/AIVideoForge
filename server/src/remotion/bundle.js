/**
 * Remotion Bundle Service
 *
 * 把前端 Remotion 工程（入口 src/remotion/entry.tsx）打包成可被 renderer 消费的 serveUrl，
 * 进程内仅 bundle 一次（首次 ~10s），后续命中缓存。
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repo root: <repo>/server/src/remotion -> ../../..
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_SRC = path.join(REPO_ROOT, 'src');
const ENTRY_POINT = path.join(FRONTEND_SRC, 'remotion', 'entry.tsx');

let cachedServeUrl = null;
let bundlingPromise = null;

/**
 * 在 webpack 配置中重申 Vite 的路径别名 `@` -> `<repo>/src`
 */
function webpackOverride(config) {
  return {
    ...config,
    resolve: {
      ...(config.resolve || {}),
      alias: {
        ...((config.resolve && config.resolve.alias) || {}),
        '@': FRONTEND_SRC,
      },
    },
  };
}

export async function getServeUrl() {
  if (cachedServeUrl) return cachedServeUrl;
  if (bundlingPromise) return bundlingPromise;

  bundlingPromise = (async () => {
    const serveUrl = await bundle({
      entryPoint: ENTRY_POINT,
      webpackOverride,
    });
    cachedServeUrl = serveUrl;
    return serveUrl;
  })();

  try {
    return await bundlingPromise;
  } finally {
    bundlingPromise = null;
  }
}
