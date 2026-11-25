import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const defaultCatalog=new URL('../references/layerswap-wallets.json',import.meta.url);
const normalized=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
const namespaces={eip155:'evm',solana:'solana',starknet:'starknet',tron:'tron',bip122:'bitcoin',ton:'ton',stellar:'stellar',fuel:'fuel'};
export async function discoverWallet(repo,name,{catalog,registry=[]}={}) {
  catalog??=JSON.parse(await readFile(defaultCatalog,'utf8'));
  const canonicalNames=new Set(catalog.entries.filter(e=>[e.name,...e.aliases].some(n=>normalized(n)===normalized(name))).map(e=>normalized(e.name)));
  const matches=catalog.entries.filter(e=>canonicalNames.has(normalized(e.name)));
  const evidence=[];
  for(const entry of matches) {
    try {
      const source=await readFile(resolve(repo,entry.source),'utf8');
      const index=source.indexOf(entry.probe);
      if(index>=0)evidence.push({...entry,line:source.slice(0,index).split('\n').length});
    }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const dynamic=registry.filter(e=>normalized(e.name??'')===normalized(name));
  const families=[...new Set([...evidence.flatMap(e=>e.families),...dynamic.flatMap(e=>(e.chains??[]).map(c=>namespaces[c.split(':')[0]]).filter(Boolean))])];
  const kinds=[...new Set(evidence.map(e=>e.kind))];
  const direct=evidence.some(e=>e.kind==='browser-candidate');
  return {wallet:name,compatibility:evidence.length?'SOURCE_OR_SDK_CANDIDATE':dynamic.length?'REGISTRY_CANDIDATE':'DISCOVERY_REQUIRED',
    families,kinds,evidence,registry:dynamic.map(e=>({name:e.name,chains:e.chains,chromeStore:e.chrome_store??null})),
    setupApproach:kinds.includes('transport')?'SELECT_REAL_WALLET':direct?'VERIFY_OFFICIAL_EXTENSION_THEN_NATIVE_SETUP':
      kinds.some(k=>['external-device','external-organization','external-identity','multisig-service'].includes(k))?'USER_ACTION_OR_SEPARATE_AUTHORIZATION_MAY_BE_REQUIRED':'DISCOVER_RUNTIME_PLATFORM_AND_NATIVE_SETUP',
    onboarding:'NOT_LIVE_VALIDATED',next:'Inspect actual Layerswap picker for the requested chain, verify vendor platform/download and native backup method; do not substitute a different wallet.'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [repo,name,...flags]=process.argv.slice(2);
  if(!repo||!name)throw Error('USAGE_REPO_WALLET_NAME_OPTIONAL_REGISTRY');
  let registry=[];let registryStatus='NOT_REQUESTED';
  if(flags.includes('--registry')) {
    try {
      const response=await fetch('https://layerswap.io/app/api/wallet-registry',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({names:[name]}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw Error('REGISTRY_UNAVAILABLE');
      const data=await response.json();if(!Array.isArray(data.wallets))throw Error('REGISTRY_INVALID');
      registry=data.wallets;registryStatus='OBSERVED';
    }catch{registryStatus='UNAVAILABLE_DOES_NOT_PROVE_UNSUPPORTED';}
  }
  console.log(JSON.stringify({...await discoverWallet(resolve(repo),name,{registry}),registryStatus},null,2));
}
