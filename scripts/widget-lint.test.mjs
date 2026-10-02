import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({ cwd, overrideConfigFile: 'eslint.widget.config.mjs', allowInlineConfig: false });
const browserFiles = [
  'packages/widget/core/src/Logo.tsx',
  'packages/widget/react/src/Widget.tsx',
  'packages/widget/js/src/loader.ts',
  'packages/ui-kit/src/Logo.tsx',
  'packages/wallets/adapters/evm/src/Logo.tsx',
  'apps/widget-cdn/src/Widget.tsx',
  'examples/widget-react-host/src/App.tsx',
];

for (const filePath of browserFiles) {
  test(`blocks server renderers in ${filePath}`, async () => {
    const [result] = await eslint.lintText("import { renderToString } from 'react-dom/server';", { filePath });
    assert.equal(result.errorCount, 1);
    assert.equal(result.messages[0].ruleId, 'no-restricted-imports');
    assert.match(result.messages[0].message, /host React version/);
  });
}

const forbidden = [
  "import Server from 'react-dom/server';",
  "import * as Server from 'react-dom/server.browser';",
  "import 'react-dom/server.node';",
  "import { renderToReadableStream } from 'react-dom/server.edge';",
  "export { renderToString } from 'react-dom/server';",
  "export * from 'react-dom/server';",
  "import { prerender } from 'react-dom/static';",
  "import { prerender } from 'react-dom/static.browser';",
  "import { prerender } from 'react-dom/static.node';",
  "import { prerender } from 'react-dom/static.edge';",
  "import { renderToReadableStream } from 'react-server-dom-webpack/server';",
  "import 'react-server-dom-turbopack/server.edge';",
  "const server = await import('react-dom/server');",
  "const server = await import(`react-dom/server.browser`);",
  "const server = require('react-dom/server');",
  "const server = require(`react-dom/static`);",
  "import server = require('react-dom/server');",
  "// eslint-disable-next-line no-restricted-imports\nimport 'react-dom/server';",
];
for (const code of forbidden) {
  test(`rejects ${code}`, async () => {
    const [result] = await eslint.lintText(code, { filePath: browserFiles[0] });
    assert.equal(result.errorCount, 1, JSON.stringify(result.messages));
    assert.ok(['no-restricted-imports', 'no-restricted-syntax'].includes(result.messages[0].ruleId));
  });
}

test('allows normal React hooks, JSX, portals and browser roots', async () => {
  const [result] = await eslint.lintText(`
    import { useState } from 'react';
    import type { ReactNode } from 'react';
    import { createPortal } from 'react-dom';
    import { createRoot } from 'react-dom/client';
    const jsx = <div />;
    const client = await import('react-dom/client');
  `, { filePath: browserFiles[0] });
  assert.deepEqual(result.messages, []);
});

for (const filePath of [
  'packages/widget/core/tests/action-message.test.mjs',
  'packages/widget/react/tests/ssr.test.mjs',
  'packages/widget/core/src/Logo.test.tsx',
  'packages/widget/core/src/__tests__/Logo.tsx',
  'apps/bridge/pages/api/render.ts',
]) {
  test(`keeps server/test code outside the restriction: ${filePath}`, async () => {
    const config = await eslint.calculateConfigForFile(filePath);
    assert.equal(config?.rules?.['no-restricted-imports'], undefined);
    assert.equal(config?.rules?.['no-restricted-syntax'], undefined);
  });
}
