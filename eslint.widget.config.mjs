import tsParser from '@typescript-eslint/parser';

const message = 'React server renderers must not enter the browser widget bundle: their bundled React DOM version can conflict with the host React version. Use browser APIs or JSX instead.';
// ESQuery requires slashes inside selector regexes to be encoded as Unicode.
const serverEntry = String.raw`/^(react-dom\u002F(server|static)($|[.\u002F])|react-server-dom-)/`;
const requiredReactShares = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom'];

const requireReactShares = {
  meta: { type: 'problem', schema: [], messages: { missing: 'React share map is missing: {{names}}.' } },
  create(context) {
    const keys = new Set();
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const collectKeys = (object) => {
      if (object?.type !== 'ObjectExpression') return;
      for (const property of object.properties) {
        if (property.type !== 'Property' || property.computed) continue;
        if (property.key.type === 'Identifier') keys.add(property.key.name);
        if (property.key.type === 'Literal') keys.add(property.key.value);
      }
    };
    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.id.name === 'SHARED_SINGLETONS') {
          collectKeys(node.init);
        }
      },
      ReturnStatement(node) {
        const owner = [...sourceCode.getAncestors(node)].reverse().find((ancestor) =>
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(ancestor.type));
        if (owner?.type === 'FunctionDeclaration' && owner.id?.name === 'hostReactShare') {
          collectKeys(node.argument);
        }
      },
      'Program:exit'(node) {
        const missing = requiredReactShares.filter((name) => !keys.has(name));
        if (missing.length) context.report({ node, messageId: 'missing', data: { names: missing.join(', ') } });
      },
    };
  },
};

const noUnsharedReactEntry = {
  meta: { type: 'problem', schema: [], messages: { unshared: 'React entry "{{name}}" is not in the explicit share list.' } },
  create(context) {
    const filename = (context.filename ?? '').replaceAll('\\', '/');
    const isTypeOnly = (node, specifierKind) =>
      node[specifierKind] === 'type'
      || (node.specifiers?.length > 0
        && node.specifiers.every((specifier) => specifier[specifierKind] === 'type'));
    const check = (node) => {
      const value = node?.type === 'Literal'
        ? node.value
        : node?.type === 'TemplateLiteral' && node.expressions.length === 0
          ? node.quasis[0].value.cooked
          : null;
      if (typeof value !== 'string') return;
      const isReactEntry = value === 'react' || value === 'react-dom'
        || value.startsWith('react/') || value.startsWith('react-dom/');
      const handledByServerRule = /^react-dom\/(server|static)($|[./])/.test(value);
      const allowedMountEntry = filename.endsWith('/apps/widget-cdn/src/mountRoot.tsx')
        && value === 'react-dom/client';
      if (isReactEntry && !handledByServerRule && !allowedMountEntry && !requiredReactShares.includes(value)) {
        context.report({ node, messageId: 'unshared', data: { name: value } });
      }
    };
    return {
      ImportDeclaration: (node) => {
        if (!isTypeOnly(node, 'importKind')) check(node.source);
      },
      ExportNamedDeclaration: (node) => {
        if (!isTypeOnly(node, 'exportKind')) check(node.source);
      },
      ExportAllDeclaration: (node) => {
        if (node.exportKind !== 'type') check(node.source);
      },
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node.arguments[0]);
      },
      TSImportEqualsDeclaration: (node) => {
        if (!node.isTypeOnly && node.importKind !== 'type') check(node.moduleReference?.expression);
      },
    };
  },
};

const reactSharesPlugin = {
  rules: { required: requireReactShares, 'no-unshared-entry': noUnsharedReactEntry },
};

// A focused check, independent of the legacy Next.js app lint configuration.
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**'] },
  {
    files: [
      'packages/**/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      'apps/widget-cdn/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      'examples/widget-react-host/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
    ],
    // SSR rendering is legitimate in tests, which do not ship to the browser.
    ignores: ['**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}', '**/__tests__/**'],
    languageOptions: { parser: tsParser },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['react-dom/server', 'react-dom/server.*', 'react-dom/server/**',
            'react-dom/static', 'react-dom/static.*', 'react-dom/static/**', 'react-server-dom-*'],
          message,
        }],
      }],
      // no-restricted-imports only covers static imports and re-exports.
      'no-restricted-syntax': ['error', {
        selector: [
          `ImportExpression[source.value=${serverEntry}]`,
          `CallExpression[callee.name='require'][arguments.0.value=${serverEntry}]`,
          `ImportExpression > TemplateLiteral.source[expressions.length=0][quasis.0.value.cooked=${serverEntry}]`,
          `CallExpression[callee.name='require'] > TemplateLiteral.arguments[expressions.length=0][quasis.0.value.cooked=${serverEntry}]`,
        ].join(', '),
        message,
      }],
    },
  },
  {
    files: [
      'packages/**/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      'apps/widget-cdn/src/**/*.{js,jsx,ts,tsx,mjs,cjs}',
    ],
    ignores: [
      '**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}',
      '**/__tests__/**',
    ],
    plugins: { 'widget-react-shares': reactSharesPlugin },
    rules: { 'widget-react-shares/no-unshared-entry': 'error' },
  },
  {
    files: ['apps/widget-cdn/rspack.config.mjs', 'packages/widget/react/src/remoteWidgetHost.tsx'],
    plugins: { 'widget-react-shares': reactSharesPlugin },
    rules: { 'widget-react-shares/required': 'error' },
  },
];
