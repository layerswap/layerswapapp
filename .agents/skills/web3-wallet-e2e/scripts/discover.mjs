import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function discover(root, diffBase) {
  let files;
  try {
    files = execFileSync('rg', ['--files', '--hidden', '-g', '!node_modules', '-g', '!.git', '-g', '!.state', '-g', '!artifacts', '-g', '!pnpm-lock.yaml', '-g', '!*.local.*', '-g', '!web3-wallet-e2e/**'], {cwd:root, maxBuffer:16*1024*1024}).toString().trim().split('\n');
  } catch (error) {
    if (error.status !== 1) throw error;
    files = [];
  }
  const packages = [];
  const hits = [];
  const pattern = /metamask|rabby|coinbase|phantom|argent|braavos|tronlink|wagmi|reown|walletconnect|starknet|solana|eth_sendTransaction|signTypedData|signMessage|sendTransaction|Connect wallet|Send from wallet|Transaction rejected/i;
  for (const file of files) {
    if (file.endsWith('package.json')) {
      try {
        const p = JSON.parse(await readFile(resolve(root, file), 'utf8'));
        packages.push({file, name:p.name, packageManager:p.packageManager, dependencies:Object.keys({...p.dependencies,...p.devDependencies}), scripts:Object.keys(p.scripts ?? {})});
      } catch { /* Invalid/unreadable manifest is unknown, not evidence. */ }
    }
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(file)) continue;
    const text = await readFile(resolve(root,file),'utf8');
    if (text.length > 300000) continue;
    text.split('\n').forEach((line,index) => {
      if (pattern.test(line)) hits.push({ file, line:index+1, terms:[...new Set(line.match(new RegExp(pattern.source,'gi')))] });
    });
  }
  const git = args => {try {return execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();} catch {return null;}};
  return {project:root, branch:git(['branch','--show-current']), commit:git(['rev-parse','HEAD']), packages,
    structure:files.filter(f => /(?:pnpm-workspace\.yaml|playwright\.config\.|next\.config\.|\.env.*example|\.test\.|\.spec\.)/.test(f)),
    codeEvidence:hits, changedFiles:diffBase ? git(['diff','--name-only',`${diffBase}...HEAD`])?.split('\n') : [],
    runtimeOnly:['installed extension version and native UI','available routes, balances, quotes, fee simulation'],
    unknown:['secure test-profile availability','runtime wallet support until exercised'],
    note:'Candidate evidence only. Read matching files in full. Do not infer supported chains, routes or selectors from names. No environment values read.'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await discover(resolve(process.argv[2] ?? '.'),process.argv[3]),null,2));
}
