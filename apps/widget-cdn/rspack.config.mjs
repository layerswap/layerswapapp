import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import rspack from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve each polyfill package's root directory once against widget-cdn's
// own node_modules. We alias bare specifiers like `'buffer'` to the package
// directory (not its entry file) so subpath imports such as `require('util/')`
// resolve naturally through Rspack's package logic.
//
// Node's `require.resolve('buffer')` returns the built-in name, not the npm
// package path, so we resolve via `<pkg>/package.json` and take its dirname.
const polyfillDir = (pkg) => {
  const pkgJsonPath = require.resolve(`${pkg}/package.json`);
  return path.dirname(pkgJsonPath);
};
const polyfillFile = (pkg, sub) => path.join(polyfillDir(pkg), sub);

// Read the version of a workspace dependency so MF's shared scope has a
// concrete number to deduplicate against. Without this, MF logs "No version
// specified" for every hoisted copy.
const depVersion = (pkg) => {
  const json = require(require.resolve(`${pkg}/package.json`));
  return json.version;
};

// Versions that must match between host and remote (catalog-aligned).
const SHARED_SINGLETONS = {
  react: { singleton: true, requiredVersion: false, eager: false, version: depVersion('react') },
  'react-dom': { singleton: true, requiredVersion: false, eager: false, version: depVersion('react-dom') },
  wagmi: { singleton: true, requiredVersion: false, eager: false, version: depVersion('wagmi') },
  viem: { singleton: true, requiredVersion: false, eager: false, version: depVersion('viem') },
  '@tanstack/react-query': { singleton: true, requiredVersion: false, eager: false, version: depVersion('@tanstack/react-query') },
  zustand: { singleton: true, requiredVersion: false, eager: false, version: depVersion('zustand') },
};

// Channel under which artifacts are published. v1 follows the design doc
// §10 — major channels are immutable URL roots (`/v1/`, `/v2/`). Override
// at build time via `LAYERSWAP_CHANNEL=v1.3.0 pnpm build` to produce a
// pinned immutable build.
const CHANNEL = process.env.LAYERSWAP_CHANNEL || 'v1';

export default (env, argv) => {
  const isProd = argv?.mode === 'production' || process.env.NODE_ENV === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
    entry: {}, // Pure remote — no app entry.
    output: {
      // Production: dist/v1/* so `vercel.json` can serve from the channel root.
      // Dev: keep dist/ flat (the dev-server serves whatever publicPath says).
      path: path.resolve(__dirname, isProd ? `dist/${CHANNEL}` : 'dist'),
      publicPath: 'auto',
      uniqueName: 'layerswap_widget_remote',
      // remoteEntry.js stays stable so loaders can find it. Everything it
      // loads (chunks) is content-hashed for far-future cache-and-forget;
      // remoteEntry.js itself takes the short-cache from vercel.json.
      filename: '[name].js',
      chunkFilename: isProd ? '[name].[contenthash:8].js' : '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      // Browser polyfills for Node built-ins reached by wallet adapters
      // (@imtbl/sdk, ethereumjs-wallet, @toruslabs/eccrypto, bitcoinjs-lib,
      // tronweb, @solana/web3.js, etc.). Next.js auto-polyfills these in
      // the bridge app; Rspack doesn't.
      //
      // We use `alias` (not `fallback`) so the mapping applies regardless
      // of whether the importing package has a sibling `buffer`/`crypto`
      // in its own node_modules — under pnpm strict resolution it often
      // doesn't, and `fallback` only fires when the original resolve fails.
      // Aliasing forces resolution through widget-cdn's own copies.
      alias: {
        buffer: polyfillDir('buffer'),
        crypto: polyfillDir('crypto-browserify'),
        stream: polyfillDir('stream-browserify'),
        https: polyfillDir('https-browserify'),
        http: polyfillDir('stream-http'),
        os: polyfillFile('os-browserify', 'browser.js'),
        path: polyfillDir('path-browserify'),
        url: polyfillDir('url'),
        zlib: polyfillDir('browserify-zlib'),
        assert: polyfillDir('assert'),
        process: polyfillFile('process', 'browser.js'),
        util: polyfillDir('util'),
        vm: polyfillDir('vm-browserify'),
        events: polyfillDir('events'),
      },
      fallback: {
        // Genuinely unavailable in the browser — return empty modules.
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      },
    },
    module: {
      rules: [
        // The @layerswap/* packages are built with plain `tsc` and ship as
        // ESM with extensionless relative imports (e.g. `import "../lib/foo"`).
        // Strict ESM resolution would reject those; relax fullySpecified so
        // Rspack treats them as legacy ESM and resolves the .js extension.
        {
          test: /\.m?js$/,
          resolve: { fullySpecified: false },
        },
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', tsx: true },
                transform: { react: { runtime: 'automatic' } },
                target: 'es2020',
              },
            },
          },
        },
        {
          test: /\.css$/,
          // sideEffects: true — `@layerswap/widget` declares
          // `sideEffects: false` in its package.json, which makes Rspack
          // tree-shake side-effect-only imports like
          // `import '@layerswap/widget/index.css'` and the styles never
          // reach the page. Flagging .css as a side effect keeps them.
          //
          // url: false — the widget CSS references `/cnbs1.png` (and
          // similar) as a runtime asset to be served from the host
          // page's origin. Letting css-loader try to resolve them as
          // build-time imports breaks the build. Once the widget CSS is
          // migrated to CDN-absolute or `import.meta.url`-relative refs,
          // we can drop this.
          sideEffects: true,
          use: ['style-loader', { loader: 'css-loader', options: { url: false } }],
        },
      ],
    },
    plugins: [
      // Provide Buffer + process as globals — many crypto/wallet libs assume
      // them. Same reason these are auto-injected in Next.js's webpack config.
      // Use absolute paths so the resolver doesn't re-enter alias logic.
      new rspack.ProvidePlugin({
        Buffer: [polyfillFile('buffer', 'index.js'), 'Buffer'],
        process: polyfillFile('process', 'browser.js'),
      }),
      new ModuleFederationPlugin({
        name: 'layerswap_widget',
        filename: 'remoteEntry.js',
        exposes: {
          './Widget': './src/Widget.tsx',
        },
        shared: SHARED_SINGLETONS,
        // Disable MF's dev-only live-reload bridge. With the remote consumed
        // by a host on a different origin (Vite on :3001), MF's bundled
        // client posts back to :3100 to negotiate live updates and 404s.
        // We don't want HMR for the remote in dev anyway.
        dev: {
          disableLiveReload: true,
          disableHotTypesReload: true,
          disableDynamicRemoteTypeHints: true,
        },
      }),
    ],
    devServer: {
      port: 3100,
      host: '127.0.0.1',
      // The remote is fetched cross-origin by the host page (e.g. on
      // localhost:3001). Without `allowedHosts: 'all'`, webpack-dev-server
      // rejects those requests with HTTP 403 "Invalid Host header".
      allowedHosts: 'all',
      // The remote runs in a different origin (the host page on :3001) and
      // its bundle has no use for HMR; the bundled webpack-dev-server client
      // otherwise reaches back to :3100 for module-update pings and 404s
      // noisily in the host console.
      hot: false,
      liveReload: false,
      client: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      historyApiFallback: true,
    },
    // Lazy compilation polls back to the dev-server origin from the loaded
    // bundle. Since the bundle is loaded by a cross-origin host page, the
    // poll URL (`/lazy-compilation-using-…`) hits the host's server and
    // 404s. We don't need lazy compilation for a remote with a single
    // exposed entry.
    lazyCompilation: false,
    experiments: {
      outputModule: false,
    },
  };
};
