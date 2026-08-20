---
"@layerswap/utils": major
---

**Breaking:** `NetworkType` and the structural `Network` type moved to `@layerswap/widget-types` — import them from there.

**New:** `Address` / `EmailAddress` / `isEmailAddress`, `isValidAddress`, `addressFormat`, and the `isAndroid` / `isIOS` / `isMobile` and `sleep` helpers are now exported.

**New:** The `useCopyClipboard` and `useWindowDimensions` React hooks moved here from `@layerswap/ui-kit` — import them from `@layerswap/utils`. `react` is now an optional peer dependency (only the hooks require it; the rest of the package stays React-free).
