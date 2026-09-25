import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const widget = resolve(root, 'packages/widget/core/src');
const uiKit = resolve(root, 'packages/ui-kit/src');
const presentation = resolve(widget, 'components/Pages/Swap/Withdraw/Presentation');
const adapters = ['Page2Preview.tsx', 'Page2PreviewFrame.tsx'].map((name) => resolve(presentation, name));
const previewOnly = new Set([...adapters, resolve(presentation, 'ReadOnlyPreview.tsx'), resolve(presentation, 'Page2Snapshot.ts')]);

function resolveSource(specifier, from) {
    let base;
    if (specifier === '@layerswap/ui-kit/components') base = resolve(uiKit, 'components/index');
    else if (specifier === '@layerswap/ui-kit') base = resolve(uiKit, 'index');
    else if (specifier.startsWith('@/')) base = resolve(from.startsWith(uiKit) ? uiKit : widget, specifier.slice(2));
    else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
    if (!base) return;
    return [base, `${base}.tsx`, `${base}.ts`, `${base}.mjs`, `${base}/index.tsx`, `${base}/index.ts`].find((p) => existsSync(p) && /\.(tsx?|mjs)$/.test(p));
}
function parse(file) {
    return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function dependencies(tree, file) {
    return tree.statements.flatMap((node) => {
        if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier || node.isTypeOnly || node.importClause?.isTypeOnly) return [];
        const target = resolveSource(node.moduleSpecifier.text, file);
        return target ? [target] : [];
    });
}

function assertNoIntrinsicJsx(file) {
    const tree = parse(file);
    const inspect = (node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            assert.ok(!/^[a-z]/.test(node.tagName.getText(tree)), `${file}: move ${node.tagName.getText(tree)} into a shared presenter`);
        }
        ts.forEachChild(node, inspect);
    };
    inspect(tree);
}

test('snapshot adapters cannot introduce their own Page 2 markup or icons', () => {
    for (const file of adapters) {
        assertNoIntrinsicJsx(file);
        for (const node of parse(file).statements) {
            if (ts.isImportDeclaration(node)) {
                assert.ok(!/lucide|\/Icons\//.test(node.moduleSpecifier.text), `${file}: icons belong to shared presenters`);
            }
        }
    }
});

test('Page 2 controllers cannot introduce presentation that snapshots would miss', () => {
    const controllers = [
        'Withdraw/Withdraw', 'Withdraw/ManualWithdraw', 'Withdraw/SwapDetails',
        'Withdraw/SwapQuoteDetails', 'Withdraw/WalletTransferButton',
        'Withdraw/Failed', 'Withdraw/NotFound', 'Withdraw/QuoteUpdate',
        'Withdraw/Processing/Processing', 'Withdraw/Summary/Summary',
        'Withdraw/Wallet/index', 'Withdraw/Wallet/RPCUnhealthyMessage',
        'Withdraw/Wallet/Common/buttons', 'Withdraw/Wallet/Common/actionMessage',
        'Withdraw/WithdrawalProviders/Hyperliquid/index',
        'Withdraw/WithdrawalProviders/Polymarket/index',
        'Form/FeeDetails/index', 'Form/FeeDetails/Slippage',
        'Form/FeeDetails/SwapQuote/index', 'Form/FeeDetails/SwapQuote/SummaryRow',
        'Form/FeeDetails/SwapQuote/DetailedEstimates',
    ];
    for (const controller of controllers) assertNoIntrinsicJsx(resolve(widget, `components/Pages/Swap/${controller}.tsx`));
});

test('every snapshot presenter is also used by the production component graph', () => {
    const production = new Set();
    const visit = (file) => {
        if (production.has(file) || previewOnly.has(file)) return;
        production.add(file);
        for (const dependency of dependencies(parse(file), file)) visit(dependency);
    };
    for (const entry of ['components/Pages/Swap/Withdraw/index.tsx', 'components/Pages/Swap/Form/FormWrapper.tsx', 'components/Widget/Index.tsx']) visit(resolve(widget, entry));
    for (const file of adapters) {
        for (const dependency of dependencies(parse(file), file)) {
            if (!previewOnly.has(dependency)) assert.ok(production.has(dependency), `${dependency} is preview-only: use it in production too`);
        }
    }
});
