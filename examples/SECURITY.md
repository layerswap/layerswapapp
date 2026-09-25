# Example dependency security

Last checked: September 23, 2026.

These examples are standalone projects. The root workspace's dependency overrides
and lockfile do not apply to them. Use Node.js >= 22.12.0 and each example's pinned
package manager and committed lockfile.

## Security updates

- Next.js and its ESLint configuration: 15.5.26.
- React 19 examples: React and React DOM 19.2.8.
- Vite: 7.3.6; React plugin: 5.2.0.
- React Router and its framework packages: 7.18.4.
- Refreshed transitive dependencies, with local resolutions/overrides for packages
  whose parents still request vulnerable versions.

Compatibility constraints matter when refreshing these locks:

- Keep WalletConnect packages on the same 2.x release, and AppKit on 1.8.24.
  AppKit 1.8.19 has missing files in its published payment package.
- Reown's optional connector range admits newer Wagmi majors. Its connector is
  constrained to 5.11.2 for this example's Wagmi 2 integration.
- Jayson 5 removes its vulnerable `stream-json` dependency. Its browser JSON-RPC
  client was checked with a request/response round trip.
- UUID 11.1.1 retains CommonJS support. The Dynamic example also uses it for
  `rpc-websockets`, whose newer UUID dependency fails Next.js 15's server build.
- The Dynamic example keeps the shared Layerswap packages on the versions used
  by its prerelease widget, so a dependency refresh does not mix incompatible
  wallet and widget type contracts.
- WebSocket 7 callers retain patched WebSocket 7; other callers use patched
  WebSocket 8. Avoid flattening both major versions into one override.

## Ignored upstream advisories

The following upstream vulnerabilities remain in the dependency trees. Their
exact GHSA identifiers are excluded from audit failures and findings at the
project owner's request; this does not patch the underlying packages. New
advisories for these packages are still checked.

| Package | Severity | Affected examples | Required follow-up |
| --- | --- | --- | --- |
| [`elliptic` / CVE-2025-14505](https://github.com/advisories/GHSA-848j-6mx2-7j84) | Low | All eight | Replace the upstream Ethers 5 / browser crypto dependency chains, or adopt an upstream fix when available. Version 6.6.1 fixes earlier advisories but remains affected by this one. |
| [`bigint-buffer` / CVE-2025-3194](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg) | High | Dynamic, App Router, Pages Router, Vite, React Router | The Solana dependency chain must migrate away from `@solana/buffer-layout-utils`' native `bigint-buffer` dependency or publish a fix. |

Substituting an unrelated package or forcing a different cryptographic API merely
to clear an audit would require a separate compatibility and security review.

## Reproduce the audits

For the seven Yarn examples, run inside the individual example directory:

```sh
yarn install --frozen-lockfile
yarn run audit
```

For the Dynamic example:

```sh
pnpm install --ignore-workspace --frozen-lockfile
pnpm --ignore-workspace audit
```

Yarn examples use the pinned `audit-ci` development dependency and their local
`audit-ci.json`. Use `yarn run audit` explicitly: Yarn Classic's built-in
`yarn audit` does not support this allowlist and still reports the raw findings.
The Dynamic example uses native `pnpm.auditConfig.ignoreGhsas`.

These commands pass when only the listed advisories remain, and fail on other
findings at any severity. Development dependencies remain included, and registry
errors are not treated as successful audits. Remove an advisory from the local
allowlist when the dependency chain is fixed. Summary totals can still include
ignored advisories. With pnpm 10.20, use the non-JSON command above: its `--json`
mode retains unfiltered totals and a nonzero exit status.

## Validation

All eight examples passed frozen-lockfile installation, TypeScript checks, and
production builds. Next.js builds were run with `--no-lint`; ESLint was not part
of this verification. Builds used Node.js 24.11.1. WalletConnect URI formatting,
Jayson's browser JSON-RPC client, and the UUID API used by `rpc-websockets` also
passed local compatibility checks. Live wallet connections and transfers were
not exercised.

The dependency refresh also required bundling shared Layerswap ESM packages in
Next.js, declaring the App Router example's Coinbase SDK payment peers, removing
a React Router AES alias that depended on hoisting, and replacing RainbowKit's
missing custom error-page import with Next.js's default error page.

Audit exclusion verification: all eight configured audit commands passed;
removing the `elliptic` exception made the Yarn audit fail as expected.
