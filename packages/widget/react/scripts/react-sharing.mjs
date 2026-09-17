export const REACT_SHARE_RANGE = '>=18.0.0 <20.0.0';

// Prefix matching in the CDN catches imports from dependencies as well as
// application code. Host providers still need concrete module factories.
export function reactSharedConfig(versionOf) {
  return Object.fromEntries(['react', 'react/', 'react-dom', 'react-dom/'].map((request) => [
    request,
    {
      singleton: true,
      requiredVersion: REACT_SHARE_RANGE,
      eager: false,
      version: versionOf(request.startsWith('react-dom') ? 'react-dom' : 'react'),
    },
  ]));
}
