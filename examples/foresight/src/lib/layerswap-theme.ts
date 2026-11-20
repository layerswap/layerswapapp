import type { ThemeData } from '@layerswap/widget-react';

// Role mapping is based on the rendered Layerswap deposit form, rather than
// treating this dark-theme-oriented shade scale as a generic purple ramp:
// 700 = dialog; 500 = panels; 300 = selectors; 400 = balance badges/tooltips;
// 200 = control hover; 600 = borders; text = descriptions and secondary labels.
// Neutral surfaces keep violet reserved for actions, focus, and selection.
// See https://atlassian.design/foundations/color/ and WCAG 1.4.3/1.4.11.
export const foresightLayerswapTheme = {
  primary: {
    DEFAULT: '118, 85, 232',
    100: '245, 241, 255',
    200: '230, 220, 252',
    300: '209, 191, 247',
    400: '167, 139, 240',
    500: '118, 85, 232',
    600: '101, 67, 212',
    700: '82, 51, 180',
    800: '66, 40, 145',
    900: '48, 30, 108',
    text: '41, 41, 52',
  },
  secondary: {
    DEFAULT: '247, 247, 250',
    100: '139, 135, 152',
    200: '227, 224, 234',
    300: '234, 232, 240',
    400: '240, 239, 245',
    500: '247, 247, 250',
    600: '225, 222, 233',
    700: '255, 255, 255',
    800: '255, 255, 255',
    900: '251, 250, 252',
    text: '98, 95, 110',
  },
  tertiary: '118, 85, 232',
  buttonTextColor: '255, 255, 255',
  success: { Foreground: '33, 110, 78', Background: '231, 245, 238' },
  error: { Foreground: '161, 54, 82', Background: '252, 238, 241' },
  warning: { Foreground: '128, 85, 23', Background: '255, 244, 214' },
  borderRadius: 'medium',
} satisfies ThemeData;

// The SDK reuses secondary-400 for warnings and ordinary surfaces, and uses
// the primary button's white label on neutral quick-action hovers. Those roles
// cannot be separated with ThemeData alone. Keep these exceptions scoped to
// Layerswap's own portal root; no wallet, quote, or transaction logic changes.
const theme = foresightLayerswapTheme;
// Search is a composite control: put its focus indicator around the whole field.
const searchField = '.layerswap-styles .relative.flex.items-center.rounded-lg:has(> .relative.w-full > input[autocomplete="off"])';
const warningTooltip = '.layerswap-styles [data-slot="tooltip-content"]:has(.text-warning-foreground)';
export const foresightLayerswapColorOverrides = `
  .layerswap-styles .rounded-b-lg:has(.group\\/balance-warn) {
    background-color: rgb(${theme.warning.Background}) !important;
  }
  ${warningTooltip} {
    background-color: rgb(${theme.warning.Background}) !important;
    color: rgb(${theme.warning.Foreground}) !important;
    box-shadow: 0 8px 24px rgb(41 41 52 / 12%), 0 0 0 1px rgba(${theme.warning.Foreground}, 0.18) !important;
  }
  ${warningTooltip} .text-secondary-text {
    color: rgb(${theme.warning.Foreground}) !important;
  }
  ${warningTooltip} svg.bg-secondary-500 {
    background-color: rgb(${theme.warning.Background}) !important;
    fill: rgb(${theme.warning.Background}) !important;
  }
  .layerswap-styles button.bg-secondary-300.hover\\:text-primary-buttonTextColor:hover:enabled {
    color: rgb(${theme.primary.text}) !important;
  }
  .layerswap-styles button.bg-primary-500:hover:enabled {
    background-color: rgb(${theme.primary[600]}) !important;
    filter: none !important;
  }
  /* Legacy SDK message headings and connecting dots assume a dark surface. */
  .layerswap-styles :is(.bg-secondary-400, .bg-secondary-500) p.text-white {
    color: rgb(${theme.primary.text}) !important;
  }
  .layerswap-styles .loader {
    color: rgb(${theme.primary.DEFAULT}) !important;
  }
  /* Keep the ring inside the field so the wallet panel cannot clip its edges. */
  ${searchField}:has(input:focus-visible) {
    outline: 2px solid rgb(${theme.primary.DEFAULT});
    outline-offset: -2px;
  }
  ${searchField} input::placeholder {
    color: rgb(${theme.secondary.text}) !important;
  }
  .layerswap-styles :is(button, input, [role="button"], [tabindex]):focus-visible {
    outline: 2px solid rgb(${theme.primary.DEFAULT});
    outline-offset: 2px;
  }
  ${searchField} input:focus-visible {
    outline: none;
    box-shadow: none;
  }
`;
