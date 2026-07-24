#!/usr/bin/env node
// Rspack emits production chunks through `../assets/` so their runtime URL is
// stable across build IDs. That directory sits outside output.path, so Rspack's
// normal `output.clean` does not clear it for us.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_DIRECTORY } from './cdn-layout.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
rmSync(join(root, 'dist', ASSET_DIRECTORY), { recursive: true, force: true });
