import tsParser from '@typescript-eslint/parser';

const message = 'React server renderers must not enter the browser widget bundle: their bundled React DOM version can conflict with the host React version. Use browser APIs or JSX instead.';
// ESQuery requires slashes inside selector regexes to be encoded as Unicode.
const serverEntry = String.raw`/^(react-dom\u002F(server|static)($|[.\u002F])|react-server-dom-)/`;

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
];
