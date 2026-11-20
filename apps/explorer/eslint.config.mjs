import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { withoutReactCompilerRules } from '../../eslint.shared.mjs';

export default defineConfig([
  ...nextVitals,
  withoutReactCompilerRules(nextVitals),
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
