# Changesets Setup for @layerswap/wallets

This package is automatically versioned whenever any individual wallet package (`@layerswap/wallet-*`) is updated.

## How It Works

1. **`updateInternalDependencies: "patch"`** in `.changeset/config.json` ensures that when any wallet package is bumped, `@layerswap/wallets` receives a patch version bump automatically.

2. **Ignored from changesets** - The `@layerswap/wallets` package is in the `ignore` list, so you never need to manually create a changeset for it.

## Workflow

### When updating a wallet package:

1. **Create a changeset** for the wallet package you're modifying:
   ```bash
   pnpm changeset
   ```
   Select the wallet package(s) you're updating (e.g., `@layerswap/wallet-evm`)

2. **Version and publish**:
   ```bash
   pnpm version
   ```
   This will:
   - Bump the version of the wallet package(s) you changed
   - **Automatically bump `@layerswap/wallets`** to reflect the dependency updates
   - Update the changelog files

### Example

If you update `@layerswap/wallet-evm`:
- Create changeset: `pnpm changeset`
- Select: `@layerswap/wallet-evm: patch` (or minor/major as needed)
- Run version: `pnpm version`
- Result: 
  - `@layerswap/wallet-evm` gets bumped (e.g., 1.0.0-alpha1.4 → 1.0.0-alpha1.5)
  - `@layerswap/wallets` automatically gets bumped (e.g., 0.0.0 → 0.0.1)

## Verification

To see which packages will be affected by pending changes:
```bash
pnpm changeset status
```

This shows what versions will be bumped when you run `pnpm version`.

