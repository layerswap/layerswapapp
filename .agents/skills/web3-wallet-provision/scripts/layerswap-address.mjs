import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';

// Optional Layerswap integration: bundle only public address utilities, never wallet signers.
// Its ESM dist uses bundler-style extensionless imports, so direct Node import is unreliable.
export async function loadLayerswapValidator(repo,family,network) {
  const require=createRequire(resolve(repo,'apps/bridge/package.json'));
  const {build}=require('esbuild');
  const output=await build({entryPoints:[resolve(repo,'packages/utils/src/address/instance.ts')],
    tsconfig:resolve(repo,'packages/utils/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
  const directory=await mkdtemp(resolve(tmpdir(),'layerswap-public-address-'));
  const file=resolve(directory,'validators.cjs');
  try {
    await writeFile(file,output.outputFiles[0].contents,{mode:0o600});
    const {addressUtilsProviders}=require(file);
    const provider=addressUtilsProviders.find(p=>p.providerName.toLowerCase()===family);
    if(!provider)throw new Error('CHAIN_ADDRESS_VALIDATOR_UNAVAILABLE');
    return address=>provider.isValidAddress({address,network});
  } finally {delete require.cache[file];await rm(directory,{recursive:true,force:true});}
}
