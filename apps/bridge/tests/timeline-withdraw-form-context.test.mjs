import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const core = new URL('../../../packages/widget/core/', import.meta.url);
const noop = () => {};
const token = { symbol: 'ETH', decimals: 6 };
const network = { name: 'BASE_MAINNET', type: 'evm', token };
const swap = {
    source_network: network, source_token: token,
    destination_network: network, destination_token: token,
    destination_address: 'destination', requested_amount: '2', use_deposit_address: false,
};
let edits = 0;
let canAdjust = true;
let adjust;
const imports = {
    '@/lib/widgetTelemetry': { widgetTelemetry: { recordAmountInput: noop } },
    '@/components/utils/RoundDecimals': { truncateDecimals: String, truncateToDecimals: String },
    '@/components/Widget/Index': { Widget: { Footer: ({ children }) => children } },
    '@/context/settings': { useSettingsState: () => ({ networks: [network] }) },
    '@/context/swap': {
        useSwapDataState: () => ({ swapBasicData: swap }),
        useSwapDataUpdate: () => ({ canAdjustAmount: () => canAdjust, startFreshSwapAttempt: () => edits++, setSubmitedFormValues: noop }),
    },
    '@/context/swapAccounts': { useSelectedAccount: () => ({ id: 'wallet', address: 'source' }) },
    '@/helpers/swapFlow': { isDepositAddressSwap: () => false },
    '@/hooks/useFee': { transformSwapDataToQuoteArgs: noop, useQuoteData: () => ({ minAllowedAmount: 0.1, maxAllowedAmount: 10 }) },
    '@/lib/balances/useBalance': { useBalance: () => ({ balances: [{ network: network.name, token: 'ETH', amount: 1 }] }) },
    '@/lib/gases/useOutOfGas': { default: () => ({ outOfGas: true }) },
    '@/lib/gases/useSWRGas': { default: () => ({}) },
    '@/components/Input/Amount/helpers': { resolveMaxAllowedAmount: () => 0.9 },
    '@/lib/amountPresets': { amountPresetSource: noop, isAmountPreset: () => false },
    '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
    '../Form/SecondaryComponents/validationError/AdjustAmountButton': {
        AdjustAmountButton: ({ onEditAmount }) => { adjust = onEditAmount; return React.createElement('button', null, 'Adjust amount'); },
    },
    '../Form/SecondaryComponents/validationError/RefreshBalanceButton': { RefreshBalanceButton: () => null },
    './Presentation/BalanceWarningView': {
        BalanceWarningView: ({ refreshButton }) => React.createElement('div', null, 'Insufficient balance', refreshButton),
        GasWarningView: () => null,
    },
    './WalletTransferButton': { default: () => null },
    './Presentation/WalletActionTransition': { WalletActionTransition: ({ children }) => children },
    '@/lib/swapLifecycle': { lifecycleContextFromSwap: noop },
    '@/hooks/useTransferBlocked': { useTransferBlocked: noop },
    '@/hooks/useLifecycleObservation': { useLifecycleObservation: noop },
    '@/stores/swapTransactionStore': { useSwapTransactionStore: selector => selector({}) },
    '@/helpers/depositActions': { getActionableDepositAction: noop, isTransferAction: () => false },
};
const { outputText } = ts.transpileModule(readFileSync(new URL('src/components/Pages/Swap/Withdraw/Withdraw.tsx', core), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)(name => {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name in imports) return imports[name];
    throw new Error(`Unexpected dependency: ${name}`);
}, module, module.exports);
const { default: Withdraw, useWithdrawBalance } = module.exports;

test('direct swap links SSR without Formik and retain balance warnings without draft editing', () => {
    const html = renderToString(React.createElement(Withdraw, { type: 'widget' }));
    assert.match(html, /Insufficient balance/);
    assert.doesNotMatch(html, /Adjust amount/);
    function ProcessingProbe() {
        useWithdrawBalance(false);
        return React.createElement('span', null, 'Processing');
    }
    assert.match(renderToString(React.createElement(ProcessingProbe)), /Processing/);
});

test('in-form withdrawals keep amount adjustment and guard stale callbacks after execution starts', () => {
    let updated;
    const html = renderToString(React.createElement(Withdraw, {
        type: 'contained',
        onAdjustAmount: updates => { updated = { amount: '2', ...updates }; return updated; },
    }));
    assert.match(html, /Adjust amount/);
    adjust();
    assert.equal(updated.amount, '0.9');
    assert.equal(edits, 1);
    canAdjust = false;
    adjust();
    assert.equal(edits, 1, 'a stale adjust action cannot restart an executing swap');
});
