import type { SharedLib } from '@layerswap/widget-js';

function assertVersion(name: string, version: string, major: number, minMinor: number, minPatch: number) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match || Number(match[1]) !== major || Number(match[2]) < minMinor
    || (Number(match[2]) === minMinor && Number(match[3]) < minPatch)) {
    throw new Error(`[layerswap/widget-react] Unsupported ${name} ${version}. Use ${major}.${minMinor}.${minPatch} or newer within major ${major}.`);
  }
}

export function createWalletRuntimeShare({ wagmi, core, viem, query, versions }: {
  wagmi: { createConfig: unknown };
  core: { createConfig: unknown };
  viem: unknown;
  query: unknown;
  versions: { wagmi: string; core: string; viem: string; query: string };
}): Record<string, SharedLib> {
  assertVersion('wagmi', versions.wagmi, 2, 14, 11);
  assertVersion('@wagmi/core', versions.core, 2, 16, 4);
  assertVersion('viem', versions.viem, 2, 38, 0);
  assertVersion('@tanstack/react-query', versions.query, 5, 90, 11);
  if (wagmi.createConfig !== core.createConfig) {
    throw new Error('[layerswap/widget-react] Multiple @wagmi/core instances detected. Deduplicate wagmi and @wagmi/core before mounting the widget.');
  }
  const share = (lib: unknown, version: string, requiredVersion: string): SharedLib => ({
    lib: () => lib, version, requiredVersion, strictVersion: true, loaded: true,
  });
  return {
    wagmi: share(wagmi, versions.wagmi, '^2.14.11'),
    '@wagmi/core': share(core, versions.core, '^2.16.4'),
    viem: share(viem, versions.viem, '^2.38.0'),
    '@tanstack/react-query': share(query, versions.query, '^5.90.11'),
  };
}

/** Refuse an old or misconfigured remote before rendering either widget. */
export function assertRemoteWalletRuntime(probe: Record<string, unknown>, shared: Record<string, SharedLib>): void {
  const expected = {
    wagmiCreateConfig: (shared.wagmi.lib() as { createConfig: unknown }).createConfig,
    wagmiUseConfig: (shared.wagmi.lib() as { useConfig: unknown }).useConfig,
    coreCreateConfig: (shared['@wagmi/core'].lib() as { createConfig: unknown }).createConfig,
    viemCreatePublicClient: (shared.viem.lib() as { createPublicClient: unknown }).createPublicClient,
    queryClient: (shared['@tanstack/react-query'].lib() as { QueryClient: unknown }).QueryClient,
  };
  for (const [name, value] of Object.entries(expected)) {
    if (value === undefined || probe[name] !== value) {
      throw new Error(`[layerswap/widget-react] The CDN widget is using a different wallet runtime (${name}). Refusing to mount a second instance.`);
    }
  }
}
