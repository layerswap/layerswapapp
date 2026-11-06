import { cp, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { extensionIdentity } from './extension.mjs';
import { check } from './vault.mjs';

process.umask(0o077);
try {
  const [sourceArg,destinationArg,version,sha256,expectedId]=process.argv.slice(2);
  check(sourceArg && destinationArg && version && /^[a-f0-9]{64}$/.test(sha256??''),'USAGE_SOURCE_DESTINATION_VERSION_SHA256_EXTENSION_ID');
  const source=await extensionIdentity(resolve(sourceArg));
  check(/^[a-p]{32}$/.test(expectedId??''),'OFFICIALLY_VERIFIED_EXTENSION_ID_REQUIRED');
  check(source.id===expectedId,'EXTENSION_ID_MISMATCH');
  check(source.version===version && source.sha256===sha256,'EXTENSION_PIN_MISMATCH');
  const destination=resolve(destinationArg);
  check(destination!==source.path && !destination.startsWith(source.path+'/'),'INSTALL_DESTINATION_MUST_BE_SEPARATE');
  await mkdir(dirname(destination),{recursive:true,mode:0o700});
  await mkdir(destination,{mode:0o700}); // existing destination is never overwritten
  await cp(source.path,destination,{recursive:true,force:false,errorOnExist:true});
  const installed=await extensionIdentity(destination);
  check(installed.sha256===sha256 && installed.version===version,'INSTALLED_EXTENSION_MISMATCH');
  console.log(JSON.stringify({status:'INSTALLED_EXTENSION_CODE',path:destination,id:installed.id,version:installed.version,sha256:installed.sha256,note:'Launch in an isolated persistent Chromium context to activate. Source trust must be established independently.'}));
} catch(error) {
  console.error(JSON.stringify({status:'BLOCKED',code:/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'INSTALLATION_FAILED_NO_RETRY'}));
  process.exitCode=1;
}
