import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';
import { useEffect } from 'react';
import TransferCrypto from '@/components/Pages/Deposit/TransferCrypto';
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import type { SwapResponse } from '@/lib/apiClients/layerSwapApiClient';

// Keep Formik, React, SWR, SwapDataProvider, TransferCrypto and the address UI
// real. Isolate wallet/quote services and drive API timing at the client boundary.

const harness = vi.hoisted(() => ({
    fetch: vi.fn(), create: vi.fn(), claim: vi.fn(), markUsed: vi.fn(),
    initialSwap: undefined as SwapResponse | undefined,
    initialSettings: {} as { swapId?: string },
    states: [] as { id?: string; detailId?: string; source?: string }[],
}));

const sources = [
    ['ETHEREUM_MAINNET', 'USDT'], ['ETHEREUM_MAINNET', 'USDC'],
    ['ARBITRUM_MAINNET', 'USDT0'], ['BASE_MAINNET', 'ETH'],
    ['XLAYER_MAINNET', 'USDT'], ['SONIC_MAINNET', 'USDC'],
];
const network = (name: string) => ({ name, display_name: name, type: name === 'SOLANA_MAINNET' ? 'solana' : 'evm' });
const recipient = '4bXib524TgeTs5qQ9nUr5JCyxVNTEaNMqCuwbUvR54FQ';
const values = (source = sources[0]) => ({
    from: network(source[0]), fromAsset: { symbol: source[1] },
    to: network('SOLANA_MAINNET'), toAsset: { symbol: 'USDC' },
    destination_address: recipient, depositMethod: 'deposit_address',
});
const swap = (id: string, source = sources[0]) => ({
    swap: {
        id, source_network: network(source[0]), source_token: { symbol: source[1] },
        destination_network: network('SOLANA_MAINNET'), destination_token: { symbol: 'USDC' },
        destination_address: recipient, requested_amount: 0, use_deposit_address: true,
        status: 'created', transactions: [],
    },
    deposit_actions: [{ type: 'manual_transfer', network: network(source[0]), to_address: `address-${id}` }],
}) as SwapResponse;

vi.mock('@/lib/apiClients/layerSwapApiClient', () => ({
    default: class { fetcher = harness.fetch; CreateSwapAsync = harness.create; },
    TransactionType: { Input: 'input', Output: 'output' },
}));
vi.mock('@layerswap/widget-types', () => ({ SwapStatus: { Created: 'created', UserTransferPending: 'user_transfer_pending' } }));
vi.mock('@layerswap/utils', () => ({ KnownInternalNames: { Networks: {} } }));
vi.mock('@/lib/address/Address', () => ({ Address: { equals: (a: string, b: string) => a === b } }));
vi.mock('@/hooks/useWallet', () => ({ default: () => ({ wallets: [], providers: [] }) }));
vi.mock('@layerswap/wallet-core', () => ({ useProvidersConnectReady: () => true }));
vi.mock('@/context/settings', () => ({
    useInitialSettings: () => harness.initialSettings,
    useSettingsState: () => ({ sourceRoutes: [], destinationRoutes: [], networks: [] }),
}));
vi.mock('@/context/callbackProvider', () => ({ useCallbacks: () => ({ onSwapCreate: vi.fn() }) }));
vi.mock('@/hooks/useFee', () => ({ transformSwapDataToQuoteArgs: () => undefined, useQuoteData: () => ({}) }));
vi.mock('@/context/swapAccounts', () => ({ useSelectedAccount: () => undefined }));
vi.mock('@/stores/recentRoutesStore', () => ({ useRecentNetworksStore: () => vi.fn() }));
vi.mock('@/stores/slippageStore', () => ({ useSlippageStore: { getState: () => ({}) } }));
vi.mock('@/stores', () => ({ useSwapTransactionStore: () => undefined }));
vi.mock('@/stores/contractAddressStore', () => ({ useContractAddressStore: () => ({ checkContractStatus: vi.fn() }) }));
vi.mock('@/stores/gaslessPreferenceStore', () => ({ useGaslessPreferenceStore: { getState: () => ({}) } }));
vi.mock('@/stores/extendedRoutesStore', () => ({ useExtendedRoutesStore: {} }));
vi.mock('@/helpers/gasless', () => ({ isGaslessCapableRoute: () => false }));
vi.mock('@/lib/extendedRoutes/registry', () => ({ resolveExtendedRoutePlan: () => undefined }));
vi.mock('@/lib/extendedRoutes/transforms', () => ({ buildCreateSwapParamsForExtendedRoute: vi.fn() }));
vi.mock('@/hooks/useExtendedSwapDisplay', () => ({ useExtendedSwapData: () => undefined }));
vi.mock('@/components/utils/resolveSwapPhase', () => ({ resolveSwapPhase: () => ({ phase: 'awaiting_user_deposit' }) }));
vi.mock('@/lib/swapPollingPolicy', () => ({ resolveSwapPollingInterval: () => 0, SWAP_POLL_DEDUPE_MS: 0 }));
vi.mock('@/hooks/useAutoSourceRoute', () => ({ default: () => ({ isAutoSourceUpdating: false }) }));
vi.mock('@/hooks/useResolvedSwapStatus', () => ({ useResolvedSwapStatus: () => ({ isTerminal: false }) }));
vi.mock('@/lib/generateSwapInitialValues', () => ({ generateSwapInitialValues: vi.fn() }));
vi.mock('@/components/Wallet/WalletModal', () => ({ useConnectModal: () => ({}) }));
vi.mock('@/context/validationContext', () => ({
    ValidationProvider: ({ children }: any) => children,
    useValidationContext: () => ({ formValidation: {}, routeValidation: {} }),
}));
vi.mock('@/components/Pages/Deposit/depositSelectionContext', () => ({
    useDepositSelection: () => ({ destinationAddress: recipient }),
    useDepositInitialValues: () => values(),
}));
vi.mock('@/components/Pages/Deposit/depositPrefetchContext', () => ({ useDepositPrefetch: () => ({
    prefetchedSwap: harness.initialSwap, claimPrefetchedSwap: harness.claim, markSwapUsed: harness.markUsed,
}) }));
vi.mock('@/components/Pages/Deposit/depositStepContext', () => ({ useReportCloseLock: vi.fn() }));
vi.mock('@/components/Widget/Index', () => ({ Widget: {
    Content: ({ children }: any) => <><Probe />{children}</>, Footer: ({ children }: any) => children,
} }));
vi.mock('@/components/Pages/Swap/Form/DepositAddressForm/EasyDepositBanner', () => ({ default: () => null }));
vi.mock('@/components/Pages/Swap/Form/DepositAddressForm/ReceivePicker', () => ({ default: () => null }));
vi.mock('@/components/Pages/Swap/Form/DepositAddressForm/PayFromPicker', () => ({ default: ({ onSourceChange }: any) => (
    <div>{sources.map(([name, symbol]) => <button type="button" key={`${name}-${symbol}`}
        onClick={() => onSourceChange(network(name), { symbol })}>{name} {symbol}</button>)}</div>
) }));
vi.mock('@/components/Pages/Swap/Form/DepositAddressForm/DepositQuoteDetails', () => ({ default: () => null }));
vi.mock('@layerswap/ui-kit/components', () => ({ StyledQRCode: ({ value }: any) => <output aria-label="QR address">{value}</output> }));
vi.mock('@layerswap/ui-kit', () => ({ useCopyClipboard: () => [false, vi.fn()] }));
vi.mock('@/components/Buttons', () => ({ SubmitButton: ({ children, isDisabled, isSubmitting, buttonStyle, ...props }: any) => (
    <button disabled={isDisabled || isSubmitting} {...props}>{children}</button>
) }));
vi.mock('@/components/Pages/Swap/Form/SecondaryComponents/validationError', () => ({ default: () => null }));
vi.mock('@/components/Pages/Swap/Withdraw/Processing', () => ({ default: () => <div>Transfer complete</div> }));

function Probe() {
    const { swapId, swapDetails, swapBasicData } = useSwapDataState();
    useEffect(() => { harness.states.push({ id: swapId, detailId: swapDetails?.id, source: swapBasicData?.source_network.name }); });
    return <output aria-label="Active swap">{swapId ?? 'none'}</output>;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function mount(children = <TransferCrypto />, config = {}) {
    return render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0,
        shouldRetryOnError: false, revalidateOnFocus: false, ...config }}>{children}</SWRConfig>);
}

beforeEach(() => {
    harness.initialSwap = undefined;
    harness.initialSettings = {};
    harness.states = [];
    harness.claim.mockReset();
    harness.create.mockReset();
    harness.fetch.mockReset();
    harness.fetch.mockImplementation(() => new Promise(() => {}));
});
afterEach(cleanup);

describe('deposit swap identity', () => {
    it.each([false, true])('does not expose another swap while details load (global keepPreviousData=%s)', async (keepPreviousData) => {
        const pending = deferred<any>();
        harness.fetch.mockImplementation(() => pending.promise);
        const initial = swap('prefetched');
        function Switch() {
            const { setSwapId } = useSwapDataUpdate();
            return <><Probe /><button onClick={() => setSwapId('new')}>Switch</button></>;
        }
        mount(<SwapDataProvider initialSwapData={initial}><Switch /></SwapDataProvider>, { keepPreviousData });
        fireEvent.click(screen.getByText('Switch'));
        expect(screen.getByLabelText('Active swap').textContent).toBe('new');
        expect(harness.states.at(-1)?.detailId).toBeUndefined();
        expect(harness.states.at(-1)?.source).toBeUndefined();
    });

    it.each([true, false])('renders every source after delayed details (prefetched=%s)', async (prefetched) => {
        const responses = new Map<string, SwapResponse>();
        const details = new Map<string, ReturnType<typeof deferred<any>>>();
        const actions = new Map<string, ReturnType<typeof deferred<any>>>();
        let sequence = 0;
        if (prefetched) {
            harness.initialSwap = swap('prefetched');
            responses.set('prefetched', harness.initialSwap);
        }
        harness.create.mockImplementation(async (params) => {
            const result = swap(`created-${++sequence}`, [params.source_network, params.source_token]);
            responses.set(result.swap.id, result);
            details.set(result.swap.id, deferred());
            actions.set(result.swap.id, deferred());
            return { data: result };
        });
        harness.fetch.mockImplementation((url: string) => {
            const id = url.split('/')[2].split('?')[0];
            const response = responses.get(id)!;
            if (url.endsWith('/deposit_actions')) return actions.get(id)?.promise ?? Promise.resolve({ data: response.deposit_actions });
            return details.get(id)?.promise ?? Promise.resolve({ data: response });
        });
        mount();
        if (prefetched) await screen.findByText('address-prefetched', { selector: 'output' });
        else {
            await waitFor(() => expect(harness.create).toHaveBeenCalledTimes(1));
            await act(async () => details.get('created-1')!.resolve({ data: responses.get('created-1') }));
            await act(async () => actions.get('created-1')!.resolve({ data: responses.get('created-1')!.deposit_actions }));
            await screen.findByText('address-created-1', { selector: 'output' });
        }
        // Two full passes, including returning to the original source without remounting.
        for (const source of [...sources.slice(1), ...sources]) {
            const before = sequence;
            fireEvent.click(screen.getByRole('button', { name: source.join(' ') }));
            await waitFor(() => expect(sequence).toBe(before + 1));
            const id = `created-${sequence}`;
            await waitFor(() => expect(screen.getByLabelText('Active swap').textContent).toBe(id));
            expect(harness.states.filter(s => s.id === id).every(s => !s.detailId || s.detailId === id)).toBe(true);
            expect(screen.queryByLabelText('QR address')).toBeNull();
            await act(async () => details.get(id)!.resolve({ data: responses.get(id) }));
            expect(screen.queryByLabelText('QR address')).toBeNull();
            await act(async () => actions.get(id)!.resolve({ data: responses.get(id)!.deposit_actions }));
            await screen.findByText(`address-${id}`, { selector: 'output' });
            expect(screen.getAllByRole('button', { name: 'Copy deposit address', exact: true }).length).toBeGreaterThan(0);
        }
    });

    it('retains an active swap when there are no details or submitted form values yet', () => {
        harness.initialSettings = { swapId: 'resumed' };
        mount();
        expect(screen.getByLabelText('Active swap').textContent).toBe('resumed');
        expect(harness.create).not.toHaveBeenCalled();
    });

    it('does not seed a resumed id with an unrelated prefetched swap', () => {
        harness.initialSettings = { swapId: 'resumed' };
        harness.initialSwap = swap('prefetched', sources[2]);
        mount();
        expect(screen.getByLabelText('Active swap').textContent).toBe('resumed');
        expect(harness.states.at(-1)?.detailId).toBeUndefined();
        expect(harness.create).not.toHaveBeenCalled();
    });

    it('claims an in-flight prefetch and retains it while details load', async () => {
        const prefetch = deferred<SwapResponse>();
        const details = deferred<any>();
        const result = swap('claimed');
        harness.claim.mockReturnValue(prefetch.promise);
        harness.fetch.mockImplementation((url: string) => url.endsWith('/deposit_actions')
            ? Promise.resolve({ data: result.deposit_actions }) : details.promise);
        mount();
        await waitFor(() => expect(harness.claim).toHaveBeenCalledTimes(1));
        await act(async () => prefetch.resolve(result));
        expect(screen.getByLabelText('Active swap').textContent).toBe('claimed');
        expect(harness.create).not.toHaveBeenCalled();
        await act(async () => details.resolve({ data: result }));
        await screen.findByText('address-claimed', { selector: 'output' });
    });

    it('handles a source change before the previous creation and details finish', async () => {
        const firstCreate = deferred<any>();
        const firstDetails = deferred<any>();
        const first = swap('old');
        const next = swap('current', sources[2]);
        harness.create.mockReturnValueOnce(firstCreate.promise).mockResolvedValueOnce({ data: next });
        harness.fetch.mockImplementation((url: string) => {
            const response = url.includes('/old') ? first : next;
            if (url.endsWith('/deposit_actions')) return Promise.resolve({ data: response.deposit_actions });
            return response === first ? firstDetails.promise : Promise.resolve({ data: next });
        });
        mount();
        await waitFor(() => expect(harness.create).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByRole('button', { name: sources[2].join(' ') }));
        await act(async () => firstCreate.resolve({ data: first }));
        expect(screen.queryByLabelText('QR address')).toBeNull();
        await act(async () => firstDetails.resolve({ data: first }));
        await screen.findByText('address-current', { selector: 'output' });
        expect(screen.getByLabelText('Active swap').textContent).toBe('current');
        expect(harness.create).toHaveBeenCalledTimes(2);
    });
});

describe('deposit recovery', () => {
    it('shows a creation failure and retries the same selection explicitly', async () => {
        const result = swap('retried');
        harness.create.mockRejectedValueOnce(new Error('Creation unavailable')).mockResolvedValueOnce({ data: result });
        harness.fetch.mockImplementation((url: string) => Promise.resolve({ data:
            url.endsWith('/deposit_actions') ? result.deposit_actions : result }));
        mount();
        expect((await screen.findByRole('alert')).textContent).toContain('Creation unavailable');
        expect(screen.queryByLabelText('QR address')).toBeNull();
        expect(harness.create).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        await screen.findByText('address-retried', { selector: 'output' });
        expect(harness.create).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each(['details', 'actions', 'details-envelope', 'actions-envelope', 'empty-actions', 'empty-details'])
    ('retries %s failures without replacing the active swap', async (failure) => {
        const result = swap('active');
        let failing = true;
        harness.create.mockResolvedValue({ data: result });
        harness.fetch.mockImplementation(async (url: string) => {
            const actions = url.endsWith('/deposit_actions');
            if (failing && actions === (failure.includes('actions'))) {
                if (failure.startsWith('empty')) return actions ? { data: [] } : {};
                if (failure.endsWith('envelope')) return { error: { message: 'Read unavailable' } };
                throw new Error('Read unavailable');
            }
            return { data: actions ? result.deposit_actions : result };
        });
        mount();
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Active swap').textContent).toBe('active');
        expect(harness.create).toHaveBeenCalledTimes(1);
        failing = false;
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        await screen.findByText('address-active', { selector: 'output' });
        expect(screen.getByLabelText('Active swap').textContent).toBe('active');
        expect(harness.create).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('shows a retry for a genuine route mismatch instead of looping or staying on the skeleton', async () => {
        const wrong = swap('wrong', sources[2]);
        const correct = swap('correct');
        harness.create.mockResolvedValueOnce({ data: wrong }).mockResolvedValueOnce({ data: correct });
        harness.fetch.mockImplementation(async (url: string) => {
            const response = url.includes('/wrong') ? wrong : correct;
            return { data: url.endsWith('/deposit_actions') ? response.deposit_actions : response };
        });
        mount();
        expect((await screen.findByRole('alert')).textContent).toContain('does not match your selection');
        expect(harness.create).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText('Active swap').textContent).toBe('none');
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        await screen.findByText('address-correct', { selector: 'output' });
        expect(harness.create).toHaveBeenCalledTimes(2);
    });

    it('allows Deposit more on the same source after a form-created swap completes', async () => {
        const completed = swap('completed');
        completed.swap.status = 'completed' as any;
        completed.swap.transactions = [{ type: 'output', transaction_hash: 'hash', amount: 1 }] as any;
        const next = swap('next');
        harness.create.mockResolvedValueOnce({ data: completed }).mockResolvedValueOnce({ data: next });
        harness.fetch.mockImplementation(async (url: string) => {
            const response = url.includes('/completed') ? completed : next;
            return { data: url.endsWith('/deposit_actions') ? response.deposit_actions : response };
        });
        mount();
        fireEvent.click(await screen.findByRole('button', { name: 'Deposit more' }));
        await screen.findByText('address-next', { selector: 'output' });
        expect(harness.create).toHaveBeenCalledTimes(2);
    });
});
