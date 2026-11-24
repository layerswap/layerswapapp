import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import shared, { withoutReactCompilerRules } from '../../eslint.shared.mjs';

export default defineConfig([
  ...nextVitals,
  withoutReactCompilerRules(nextVitals),
  shared,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
