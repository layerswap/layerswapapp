import noConditionalLiteralsInJsx from 'eslint-plugin-no-conditional-literals-in-jsx';

const classicHookRules = ['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'];

// eslint-plugin-react-hooks 7 (via eslint-config-next 16) adds React Compiler rules we have not adopted yet.
export const withoutReactCompilerRules = (configs) => ({
  rules: Object.fromEntries(
    configs
      .flatMap((config) => Object.keys(config.rules ?? {}))
      .filter((rule) => rule.startsWith('react-hooks/') && !classicHookRules.includes(rule))
      .map((rule) => [rule, 'off']),
  ),
});

export default {
  plugins: { 'no-conditional-literals-in-jsx': noConditionalLiteralsInJsx },
  rules: {
    'no-conditional-literals-in-jsx/no-conditional-literals-in-jsx': 'error',
    'no-conditional-literals-in-jsx/no-unwrapped-jsx-text': 'error',
    'react-hooks/exhaustive-deps': 'off',
    'react/display-name': 'off',
  },
};
