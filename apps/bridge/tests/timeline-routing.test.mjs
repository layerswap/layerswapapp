import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const configure = require('../next.config.js');
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, PHASE_EXPORT } = require('next/constants');
const { defaultConfig } = require('next/dist/server/config-shared');
const { createValidFileMatcher, findPageFile } = require('next/dist/server/lib/find-page-file');
const { getPageFromPath } = require('next/dist/build/entries');
const pages = resolve(dirname(fileURLToPath(import.meta.url)), '../pages');
const pageFiles = readdirSync(pages, { recursive: true }).filter((file) => /\.(tsx?|jsx?|mjs)$/.test(file));
const productionRoutes = [
    '/', '/404', '/_app', '/_document', '/_error',
    '/api/flags', '/api/polymarket/relay', '/api/vercel/flags',
    '/campaigns', '/campaigns/[campaign]', '/imtblRedirect', '/nocookies',
    '/swap/[swapId]', '/transactions',
].sort();

function routesFor(phase) {
    const { pageExtensions } = configure(phase, { defaultConfig });
    const matcher = createValidFileMatcher(pageExtensions);
    return {
        pageExtensions,
        routes: pageFiles.filter(matcher.isPageFile)
            .map((file) => getPageFromPath(`/${file}`, pageExtensions)).sort(),
    };
}

test('development discovers the timeline and preserves all production URLs', async () => {
    const { routes, pageExtensions } = routesFor(PHASE_DEVELOPMENT_SERVER);
    assert.deepEqual(routes, [...productionRoutes, '/timeline'].sort());
    assert.equal(await findPageFile(pages, '/timeline', pageExtensions, false), '/timeline.dev.mjs');
    assert.equal(await findPageFile(pages, '/_app', pageExtensions, false), '/_app.js');
});

test('production build, server and export exclude the timeline through normal route discovery', async () => {
    for (const phase of [PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, PHASE_EXPORT]) {
        const { routes, pageExtensions } = routesFor(phase);
        assert.deepEqual(routes, productionRoutes, phase);
        for (const route of ['/timeline', '/timeline.dev', '/timeline.dev.mjs']) {
            assert.equal(await findPageFile(pages, route, pageExtensions, false), null, `${phase}: ${route}`);
        }
        assert.equal(await findPageFile(pages, '/_app', pageExtensions, false), '/_app.js');
    }
});
