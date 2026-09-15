import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { WIDGET_PROTOCOL_MAJOR } from '@layerswap/widget-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function packageMajor(relativePath) {
    const pkg = JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
    return Number(pkg.version.split('.')[0]);
}

test('public loader package majors match the CDN protocol major', () => {
    assert.equal(packageMajor('packages/widget/js/package.json'), WIDGET_PROTOCOL_MAJOR);
    assert.equal(packageMajor('packages/widget/react/package.json'), WIDGET_PROTOCOL_MAJOR);
});

