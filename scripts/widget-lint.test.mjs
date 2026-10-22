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

test('allows normal React hooks, JSX, portals and the imperative browser root', async () => {
  const [result] = await eslint.lintText(`
    import { useState } from 'react';
    import type { ReactNode } from 'react';
    import { createPortal } from 'react-dom';
    import { createRoot } from 'react-dom/client';
    const jsx = <div />;
    const client = await import('react-dom/client');
  `, { filePath: 'apps/widget-cdn/src/mountRoot.tsx' });
  assert.deepEqual(result.messages, []);
});

for (const code of [
  "import runtime from 'react/compiler-runtime';",
  "export * from 'react-dom/client';",
  "const runtime = await import('react/compiler-runtime');",
  "const runtime = require(`react-dom/client`);",
]) {
  test(`rejects unshared React entry: ${code}`, async () => {
    const [result] = await eslint.lintText(code, { filePath: browserFiles[0] });
    assert.equal(result.errorCount, 1, JSON.stringify(result.messages));
    assert.equal(result.messages[0].ruleId, 'widget-react-shares/no-unshared-entry');
  });
}

test('allows functions and entry points already covered by the share list', async () => {
  const [result] = await eslint.lintText(`
    import { useTransition } from 'react';
    import { jsx } from 'react/jsx-runtime';
  `, { filePath: browserFiles[0] });
  assert.deepEqual(result.messages, []);
});

for (const code of [
  "import type { CustomConsole } from 'react/compiler-runtime';",
  "import { type CustomConsole } from 'react/compiler-runtime';",
  "export type { CustomConsole } from 'react/compiler-runtime';",
  "export { type CustomConsole } from 'react/compiler-runtime';",
  "export type * from 'react/compiler-runtime';",
]) {
  test(`allows type-only React entry: ${code}`, async () => {
    const [result] = await eslint.lintText(code, { filePath: browserFiles[0] });
    assert.deepEqual(result.messages, []);
  });
}

for (const code of [
  "import { type CustomConsole, c } from 'react/compiler-runtime';",
  "export { type CustomConsole, c } from 'react/compiler-runtime';",
]) {
  test(`rejects mixed type/runtime React entry: ${code}`, async () => {
    const [result] = await eslint.lintText(code, { filePath: browserFiles[0] });
    assert.equal(result.errorCount, 1, JSON.stringify(result.messages));
    assert.equal(result.messages[0].ruleId, 'widget-react-shares/no-unshared-entry');
  });
}

test('allows only react-dom/client in the imperative mount exception', async () => {
  const [result] = await eslint.lintText(
    "import runtime from 'react/compiler-runtime';",
    { filePath: 'apps/widget-cdn/src/mountRoot.tsx' },
  );
  assert.equal(result.errorCount, 1, JSON.stringify(result.messages));
  assert.equal(result.messages[0].ruleId, 'widget-react-shares/no-unshared-entry');
});

test('requires every explicit React share on both federation sides', async () => {
  const entries = `{
    react: {},
    'react/jsx-runtime': {},
    'react/jsx-dev-runtime': {},
    'react-dom': {},
  }`;
  const owners = {
    'apps/widget-cdn/rspack.config.mjs': `const SHARED_SINGLETONS = ${entries};`,
    'packages/widget/react/src/remoteWidgetHost.tsx': `function hostReactShare() { return ${entries}; }`,
  };
  for (const [filePath, complete] of Object.entries(owners)) {
    const [valid] = await eslint.lintText(complete, { filePath });
    assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
    const [invalid] = await eslint.lintText(complete.replace("'react/jsx-runtime': {},", ''), { filePath });
    assert.equal(invalid.messages[0].ruleId, 'widget-react-shares/required');
    assert.match(invalid.messages[0].message, /react\/jsx-runtime/);
  }
});

test('does not accept required names from an unrelated object', async () => {
  const [result] = await eslint.lintText(`
    const SHARED_SINGLETONS = { react: {}, 'react-dom': {} };
    const unrelated = { 'react/jsx-runtime': {}, 'react/jsx-dev-runtime': {} };
  `, { filePath: 'apps/widget-cdn/rspack.config.mjs' });
  assert.equal(result.errorCount, 1, JSON.stringify(result.messages));
  assert.match(result.messages[0].message, /react\/jsx-runtime, react\/jsx-dev-runtime/);
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
