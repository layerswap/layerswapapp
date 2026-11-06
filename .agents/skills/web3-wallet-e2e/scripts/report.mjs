import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export function report(r) {
  const clean = value => String(value ?? 'not observed').replace(/[\r\n|]/g,' ');
  return `# Wallet E2E: ${clean(r.scenarioId)}\n\nStatus: **${clean(r.status)}**\n\n` +
    `App: ${clean(r.appUrl)}\n\nCommit: ${clean(r.commit)} (${clean(r.branch)})\n\n` +
    `Wallet: ${clean(r.wallet)} ${clean(r.walletVersion)}; browser: ${clean(r.browserVersion)}\n\n` +
    `Expected: ${clean(r.expectedResult)}\n\nObserved: ${clean(r.actualResult)}\n\n` +
    `| Check | Outcome |\n| --- | --- |\n` + Object.entries(r.checks ?? {}).map(([k,v])=>`| ${clean(k)} | ${clean(v)} |`).join('\n') +
    `\n\nNo authorization action is implemented. Independent absence of broadcast: ${clean(r.broadcastVerification)}.\n\n` +
    `Evidence: result.json, ${clean(r.screenshot)}, ${clean(r.trace)}. Missing wallet fields: ${clean(r.assessment?.missing?.join(', '))}.\n`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = resolve(process.argv[2]);
  const r = JSON.parse(await readFile(path,'utf8'));
  await writeFile(resolve(path,'../report.md'),report(r),{mode:0o600});
}
