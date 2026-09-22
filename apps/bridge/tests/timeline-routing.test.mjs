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

function routesFor(phase, vercelEnvironment) {
    const previousEnvironment = process.env.VERCEL_ENV;
    let pageExtensions;
    try {
        if (vercelEnvironment === undefined) delete process.env.VERCEL_ENV;
        else process.env.VERCEL_ENV = vercelEnvironment;
        ({ pageExtensions } = configure(phase, { defaultConfig }));
    } finally {
        if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
        else process.env.VERCEL_ENV = previousEnvironment;
    }
    const matcher = createValidFileMatcher(pageExtensions);
    return {
        pageExtensions,
        routes: pageFiles.filter(matcher.isPageFile)
            .map((file) => getPageFromPath(`/${file}`, pageExtensions)).sort(),
    };
}

test('local development discovers the timeline and preserves all production URLs', async () => {
    const { routes, pageExtensions } = routesFor(PHASE_DEVELOPMENT_SERVER);
    assert.deepEqual(routes, [...productionRoutes, '/timeline'].sort());
    assert.equal(await findPageFile(pages, '/timeline', pageExtensions, false), '/timeline.dev.mjs');
    assert.equal(await findPageFile(pages, '/_app', pageExtensions, false), '/_app.js');
});

test('Vercel preview and development deployments include the timeline in optimized builds', async () => {
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        for (const environment of ['preview', 'development']) {
            for (const phase of [PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, PHASE_EXPORT]) {
                const { routes, pageExtensions } = routesFor(phase, environment);
                assert.deepEqual(routes, [...productionRoutes, '/timeline'].sort(), `${environment}: ${phase}`);
                assert.equal(await findPageFile(pages, '/timeline', pageExtensions, false), '/timeline.dev.mjs');
            }
        }
    } finally {
        if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnvironment;
    }
});

test('production, unknown environments and ordinary local builds exclude the timeline', async () => {
    for (const environment of ['production', 'staging', undefined]) {
        const phases = [PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, PHASE_EXPORT];
        if (environment) phases.push(PHASE_DEVELOPMENT_SERVER);
        for (const phase of phases) {
            const { routes, pageExtensions } = routesFor(phase, environment);
            assert.deepEqual(routes, productionRoutes, `${environment}: ${phase}`);
            for (const route of ['/timeline', '/timeline.dev', '/timeline.dev.mjs']) {
                assert.equal(await findPageFile(pages, route, pageExtensions, false), null, `${environment}: ${phase}: ${route}`);
            }
            assert.equal(await findPageFile(pages, '/_app', pageExtensions, false), '/_app.js');
        }
    }
});
