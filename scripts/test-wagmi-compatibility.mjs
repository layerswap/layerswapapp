#!/usr/bin/env node
// Run after building widget-types, utils, wallet-core, wallet-evm and the loaders.
// Snapshots contain real wagmi/core/viem packages; the adapter's connector SDKs
// stay on the workspace versions. Wallet/RPC effects are mocked by the tests.
import { mkdtemp, mkdir, readFile, writeFile, symlink, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(join(root, 'packages/wallets/adapters/evm/package.json'));
const versions = ['2.14.11', '2.14.16', '2.15.7', '2.16.9', '2.17.5', '2.18.2', '2.19.5'];
const fixture = await realpath(await mkdtemp(join(tmpdir(), 'layerswap-wagmi-test-')));
await mkdir(join(fixture, 'node_modules'));
await writeFile(join(fixture, 'package.json'), '{"type":"module"}');
const downloaded = new Set();

async function installedRoot(name, from = req) {
  let p = dirname(from.resolve(name));
  for (;;) {
    try { if (JSON.parse(await readFile(join(p, 'package.json'), 'utf8')).name === name) return p; } catch { /* find the package root */ }
    const parent = dirname(p);
    if (parent === p) throw new Error(`Cannot locate installed ${name}`);
    p = parent;
  }
}

async function snapshot(name, version) {
  const alias = `${name === '@wagmi/core' ? 'core' : name}-${version}`;
  const dest = join(fixture, 'node_modules', alias);
  if (downloaded.has(alias)) return;
  const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
  if (!response.ok) throw new Error(`Cannot read ${name}@${version}: ${response.status}`);
  const metadata = await response.json();
  const archiveResponse = await fetch(metadata.dist.tarball);
  if (!archiveResponse.ok) throw new Error(`Cannot download ${name}@${version}`);
  const archive = Buffer.from(await archiveResponse.arrayBuffer());
  const [algorithm, digest] = metadata.dist.integrity.split('-');
  if (createHash(algorithm).update(archive).digest('base64') !== digest) throw new Error(`Integrity mismatch: ${alias}`);
  await mkdir(dest, { recursive: true });
  const tarball = join(fixture, `${alias}.tgz`);
  await writeFile(tarball, archive);
  const extraction = spawnSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', dest], { encoding: 'utf8' });
  if (extraction.status !== 0) throw new Error(extraction.stderr);
  // Reuse installed SDK dependencies without modifying their versions or the lockfile.
  const installed = await installedRoot(name);
  const dependencies = name.startsWith('@') ? dirname(dirname(installed)) : dirname(installed);
  await symlink(dependencies, join(dest, 'node_modules'), 'dir');
  downloaded.add(alias);
  return metadata;
}

const coreVersions = {};
for (const version of versions) {
  const metadata = await snapshot('wagmi', version);
  const core = metadata.dependencies['@wagmi/core'];
  coreVersions[version] = core;
  await snapshot('@wagmi/core', core);
}
for (const version of ['2.21.16', '2.31.0', '2.38.0']) await snapshot('viem', version);

const parents = Object.fromEntries(await Promise.all(['wagmi', '@wagmi/core', 'viem'].map(async name => [name, pathToFileURL(join(await installedRoot(name), 'package.json')).href])));
const hook = join(fixture, 'hook.mjs');
await writeFile(hook, `
import { registerHooks } from 'node:module';
const root = ${JSON.stringify(pathToFileURL(join(fixture, 'package.json')).href)};
const parents = ${JSON.stringify(parents)};
const cores = ${JSON.stringify(coreVersions)};
registerHooks({ resolve(specifier, context, next) {
  const hostOnly = process.env.LS_WAGMI_MODE === 'host';
  const fromFixture = context.parentURL?.startsWith(${JSON.stringify(pathToFileURL(fixture).href)});
  const fromTest = context.parentURL?.endsWith('/wagmi-compatibility.test.mjs');
  if ((specifier === 'wagmi' || specifier.startsWith('wagmi/')) && (!hostOnly || fromFixture || fromTest))
    return next(specifier.replace('wagmi', 'wagmi-' + process.env.LS_WAGMI_VERSION), { ...context, parentURL: root });
  if ((specifier === '@wagmi/core' || specifier.startsWith('@wagmi/core/')) && (!hostOnly || fromFixture))
    return next(specifier.replace('@wagmi/core', 'core-' + cores[process.env.LS_WAGMI_VERSION]), { ...context, parentURL: root });
  if (specifier === 'viem' || specifier.startsWith('viem/'))
    return next(specifier.replace('viem', 'viem-' + process.env.LS_VIEM_VERSION), { ...context, parentURL: root });
  try { return next(specifier, context); } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || specifier.startsWith('.') || specifier.startsWith('/')) throw error;
    const parent = context.parentURL?.includes('/viem-') ? parents.viem : context.parentURL?.includes('/core-') ? parents['@wagmi/core'] : parents.wagmi;
    return next(specifier, { ...context, parentURL: parent });
  }
}});
`);

const { readdir } = await import('node:fs/promises');
const testsDir = join(root, 'packages/wallets/adapters/evm/tests');
const allTests = (await readdir(testsDir)).filter(file => file.endsWith('.test.mjs')).map(file => join(testsDir, file));
const results = [];
for (const wagmi of versions) {
  for (const mode of ['all', 'host']) {
    const tests = mode === 'all' ? allTests : [join(testsDir, 'wagmi-compatibility.test.mjs')];
    const result = spawnSync(process.execPath, ['--import', hook, '--test', ...tests], {
      cwd: root, env: { ...process.env, LS_WAGMI_VERSION: wagmi, LS_VIEM_VERSION: '2.38.0', LS_WAGMI_MODE: mode }, encoding: 'utf8', timeout: 60_000,
    });
    await writeFile(join(fixture, `${wagmi}-${mode}.log`), result.stdout + result.stderr);
    results.push({ wagmi, core: coreVersions[wagmi], viem: '2.38.0', mode, pass: result.status === 0 });
    console.log(`${wagmi} / ${mode}: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
  }
}
// Compile the public host-config boundary with one deduplicated type graph.
const cdnReq = createRequire(join(root, 'apps/widget-cdn/package.json'));
const reactDomTypes = join(dirname(cdnReq.resolve('@types/react-dom/package.json')), 'index.d.ts');
for (const wagmi of versions) {
  const source = join(fixture, `types-${wagmi}.ts`);
  await writeFile(source, `
import { createConfig, http } from 'wagmi';
import { mainnet } from 'viem/chains';
import type { SharedWagmiWidgetProps } from ${JSON.stringify(join(root, 'packages/widget/react/src/wagmi.js'))};
import type { EVMProviderConfig } from ${JSON.stringify(join(root, 'packages/wallets/adapters/evm/src/types.js'))};
const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() } });
const loader: SharedWagmiWidgetProps = { wagmiConfig: config };
const adapter: EVMProviderConfig = { wagmiConfig: config };
`);
  const configFile = join(fixture, `tsconfig-${wagmi}.json`);
  await writeFile(configFile, JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
    skipLibCheck: true, noEmit: true, jsx: 'react-jsx', esModuleInterop: true,
    paths: {
      wagmi: [join(fixture, `node_modules/wagmi-${wagmi}/dist/types/exports/index.d.ts`)],
      '@wagmi/core': [join(fixture, `node_modules/core-${coreVersions[wagmi]}/dist/types/exports/index.d.ts`)],
      '@wagmi/core/*': [join(fixture, `node_modules/core-${coreVersions[wagmi]}/dist/types/exports/*`)],
      viem: [join(fixture, 'node_modules/viem-2.38.0/_types/index.d.ts')],
      'viem/*': [join(fixture, 'node_modules/viem-2.38.0/_types/*')],
      'react-dom': [reactDomTypes],
    },
  }, files: [source] }));
  const result = spawnSync(join(root, 'node_modules/.bin/tsc'), ['-p', configFile], { cwd: root, encoding: 'utf8', timeout: 60_000 });
  await writeFile(join(fixture, `${wagmi}-types.log`), result.stdout + result.stderr);
  results.push({ wagmi, mode: 'types', pass: result.status === 0 });
  console.log(`${wagmi} / types: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
}

// Verify the incompatible combinations remain negative controls.
for (const viem of ['2.21.16', '2.31.0']) {
  const result = spawnSync(process.execPath, ['--import', hook, '--test', join(testsDir, 'wagmi-compatibility.test.mjs')], {
    cwd: root, env: { ...process.env, LS_WAGMI_VERSION: '2.19.5', LS_VIEM_VERSION: viem }, encoding: 'utf8', timeout: 60_000,
  });
  const output = result.stdout + result.stderr;
  const expected = result.status !== 0 && /does not provide an export named/.test(output);
  await writeFile(join(fixture, `negative-viem-${viem}.log`), output);
  results.push({ wagmi: '2.19.5', viem, mode: 'negative-control', pass: expected });
  console.log(`old viem ${viem} rejected: ${expected ? 'PASS' : 'FAIL'}`);
}
await writeFile(join(fixture, 'results.json'), JSON.stringify(results, null, 2));
console.log(`Results and complete logs: ${fixture}`);
if (results.some(row => !row.pass)) process.exitCode = 1;
