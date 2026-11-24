// typescript-eslint needs the TS compiler API, which TypeScript 7 no longer ships.
const usesTypeScriptApi = /^(@typescript-eslint\/.+|typescript-eslint|ts-api-utils|eslint-config-next)$/;

function readPackage(pkg) {
  if (usesTypeScriptApi.test(pkg.name) && pkg.peerDependencies?.typescript) {
    delete pkg.peerDependencies.typescript;
    delete pkg.peerDependenciesMeta?.typescript;
    pkg.dependencies = { ...pkg.dependencies, typescript: '~6.0.3' };
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
