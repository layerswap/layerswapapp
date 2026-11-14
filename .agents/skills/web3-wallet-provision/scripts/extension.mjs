import {createHash} from 'node:crypto';
import {readFile,readdir,realpath} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {check} from './vault.mjs';
export async function extensionIdentity(directory) {
  const path = await realpath(directory);
  const manifest = JSON.parse(await readFile(resolve(path, 'manifest.json'), 'utf8'));
  check(manifest.manifest_version === 3 && manifest.key, 'UNSUPPORTED_EXTENSION_MANIFEST');
  const bytes = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16);
  const id = [...bytes].flatMap(b => [b >> 4, b & 15]).map(n => String.fromCharCode(97 + n)).join('');
  const hash = createHash('sha256');
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '_metadata') continue;
      check(!entry.isSymbolicLink(), 'EXTENSION_SYMLINK');
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { hash.update(relative(path, file)); hash.update('\0'); hash.update(await readFile(file)); hash.update('\0'); }
    }
  }
  await walk(path);
  return { path, id, version: manifest.version_name ?? manifest.version, sha256: hash.digest('hex') };
}
