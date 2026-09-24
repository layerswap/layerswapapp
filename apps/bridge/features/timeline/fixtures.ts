import {
    ActionMessageType,
    NetworkType,
    SwapStatus,
    type Network,
    type Token,
    type Refuel,
} from '@layerswap/widget-types';
import {
    BackendTransactionStatus,
    TransactionStatus,
    TransactionType,
    SwapPhase,
    type Page2LoadedSnapshot,
    type Page2Snapshot,
    type Page2WalletState,
    type SwapDetails,
    type SwapQuote,
    type Transaction,
    type DepositAction,
} from '@layerswap/widget/internal';
import {
    timelineGroups,
    timelineSections,
    type TimelineMilestone,
    type TimelineScenario,
} from './model';

// All dates, accounts, hashes and values are synthetic. Fixtures are imported only by /timeline.
export const EPOCH = Date.parse('2025-01-01T12:00:00.000Z');
const date = (seconds: number) =>
    new Date(EPOCH + seconds * 1000).toISOString();
const account = `0x${'1'.repeat(40)}`;
const destination = `0x${'2'.repeat(40)}`;
const deposit = `0x${'3'.repeat(40)}`;
const hash = `0x${'a'.repeat(64)}`;
const icon = (label: string, color: string) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="${color}"/><text x="20" y="26" fill="white" font-family="sans-serif" font-size="20" text-anchor="middle">${label}</text></svg>`)}`;
const usdc: Token = {
    symbol: 'USDC',
    asset: 'USDC',
    logo: icon('$', '#2775ca'),
    contract: `0x${'4'.repeat(40)}`,
    decimals: 6,
    precision: 2,
    price_in_usd: 1,
    listing_date: date(0),
};
const eth: Token = {
    ...usdc,
    symbol: 'ETH',
    asset: 'ETH',
    logo: icon('Ξ', '#627eea'),
    contract: null,
    decimals: 18,
    precision: 6,
    price_in_usd: 2500,
};
const ethereum: Network = {
    name: 'ETHEREUM_MAINNET',
    display_name: 'Ethereum',
    type: NetworkType.EVM,
    logo: icon('Ξ', '#627eea'),
    chain_id: '1',
    node_url: 'https://rpc.example.invalid',
    nodes: [],
    deposit_methods: ['wallet', 'deposit_address'],
    token: eth,
    transaction_explorer_template: 'https://explorer.example.invalid/tx/{0}',
    account_explorer_template: 'https://explorer.example.invalid/address/{0}',
};
const base: Network = {
    ...ethereum,
    name: 'BASE_MAINNET',
    display_name: 'Base',
    chain_id: '8453',
    logo: icon('B', '#0052ff'),
};
const quote: SwapQuote = {
    source_network: ethereum,
    destination_network: base,
    source_token: usdc,
    destination_token: usdc,
    requested_amount: 100,
    receive_amount: 99,
    min_receive_amount: 98.5,
    total_fee: 1,
    total_fee_in_usd: 1,
    blockchain_fee: 0.6,
    service_fee: 0.4,
    avg_completion_time: '00:01:00',
    slippage: 0.005,
    rate: 1,
};
const details = (patch: Partial<SwapDetails> = {}): SwapDetails => ({
    id: '00000000-0000-4000-8000-000000000365',
    created_date: date(0),
    source_address: account,
    status: SwapStatus.UserTransferPending,
    transactions: [],
    exchange_account_connected: false,
    metadata: { reference_id: null, app: null, sequence_number: 1 },
    ...patch,
});
const snapshot = (
    patch: Partial<Page2LoadedSnapshot> = {},
): Page2LoadedSnapshot => ({
    kind: 'swap',
    swap: {
        source_network: ethereum,
        destination_network: base,
        source_token: usdc,
        destination_token: usdc,
        destination_address: destination,
        requested_amount: '100',
        use_deposit_address: false,
    },
    details: details(),
    quote,
    sourceAddress: account,
    quoteState: { status: 'ready', expanded: false, gasFeeInUsd: 0.42 },
    wallet: { kind: 'send' },
    ...patch,
});
const transaction = (
    type: TransactionType,
    patch: Partial<Transaction> = {},
): Transaction => ({
    type,
    from: account,
    to: type === TransactionType.Input ? deposit : destination,
    created_date: date(20),
    timestamp: date(20),
    amount: type === TransactionType.Input ? 100 : 99,
    transaction_hash: hash,
    confirmations: 12,
    max_confirmations: 12,
    usd_value: 100,
    usd_price: 1,
    status: BackendTransactionStatus.Completed,
    ...patch,
});
const input = transaction(TransactionType.Input);
const output = transaction(TransactionType.Output, {
    timestamp: date(90),
    created_date: date(90),
});
const stored = {
    hash,
    status: TransactionStatus.Pending,
    timestamp: EPOCH + 10_000,
};
const processing = (
    patch: Partial<SwapDetails> = {},
    extra: Partial<Page2LoadedSnapshot> = {},
) =>
    snapshot({
        details: details({ transactions: [input], ...patch }),
        ...extra,
    });
const m = (
    at: number,
    id: string,
    label: string,
    description: string,
    snapshot: Page2Snapshot,
    expectedPhase?: SwapPhase,
): TimelineMilestone => ({
    at,
    id,
    label,
    description,
    snapshot,
    expectedPhase,
});
const ready = m(
    0,
    'ready',
    'Ready to send',
    'The quote is ready and the selected wallet can send the deposit.',
    snapshot(),
    SwapPhase.AwaitingUserDeposit,
);
const pendingInput = m(
    20,
    'confirmations',
    'Confirming deposit',
    'The input transaction is published with 3 of 12 confirmations.',
    processing({
        transactions: [
            transaction(TransactionType.Input, { confirmations: 3 }),
        ],
    }),
    SwapPhase.InputPending,
);
const confirmed = m(
    50,
    'output-pending',
    'Sending output',
    'The deposit has reached 12 confirmations. The output transfer is pending.',
    processing({ status: SwapStatus.LsTransferPending }),
    SwapPhase.OutputPending,
);
const completed = m(
    90,
    'completed',
    'Transfer complete',
    'The output hash and final amount are available.',
    processing({ status: SwapStatus.Completed, transactions: [input, output] }),
    SwapPhase.Completed,
);
const milestoneWallet = (
    at: number,
    id: string,
    label: string,
    description: string,
    wallet: Page2WalletState,
    extra: Partial<Page2LoadedSnapshot> = {},
) =>
    m(
        at,
        id,
        label,
        description,
        snapshot({ wallet, ...extra }),
        SwapPhase.AwaitingUserDeposit,
    );
const standard: TimelineScenario = {
    id: 'wallet-success',
    label: 'Successful wallet transfer',
    group: 'wallet-transfer',
    section: 'main-flow',
    milestones: [
        ready,
        milestoneWallet(
            5,
            'preparing',
            'Preparing',
            'Transfer details are being prepared.',
            { kind: 'send', pending: true, label: 'Preparing' },
        ),
        milestoneWallet(
            8,
            'confirm',
            'Confirm in wallet',
            'The wallet is waiting for transaction approval.',
            { kind: 'send', pending: true, label: 'Confirm in your wallet' },
        ),
        m(
            10,
            'publishing',
            'Publishing deposit',
            'The wallet returned a hash; the backend has not detected the input yet.',
            snapshot({ storedWalletTransaction: stored }),
            SwapPhase.InputPending,
        ),
        pendingInput,
        m(
            35,
            'more-confirmations',
            '8 of 12 confirmations',
            'The same deposit has gained five more confirmations.',
            processing({
                transactions: [
                    transaction(TransactionType.Input, { confirmations: 8 }),
                ],
            }),
            SwapPhase.InputPending,
        ),
        confirmed,
        m(
            75,
            'finalizing',
            'Finalizing transfer',
            'The backend reports completed before the output hash and amount arrive.',
            processing({ status: SwapStatus.Completed }),
            SwapPhase.SettlingOutput,
        ),
        completed,
    ],
};
const refuel: Refuel = {
    network: base,
    token: eth,
    amount: 0.0004,
    amount_in_usd: 1,
};
const failures: TimelineScenario[] = [
    {
        id: 'input-failure',
        label: 'Input failure and retry',
        group: 'wallet-transfer',
        section: 'outcomes',
        milestones: [
            ready,
            pendingInput,
            m(
                30,
                'failed',
                'Input failed',
                'The input transaction failed; retry is available.',
                processing(
                    {
                        transactions: [
                            transaction(TransactionType.Input, {
                                confirmations: 0,
                                status: BackendTransactionStatus.Failed,
                            }),
                        ],
                    },
                    {
                        storedWalletTransaction: {
                            ...stored,
                            status: TransactionStatus.Failed,
                        },
                    },
                ),
                SwapPhase.Failed,
            ),
            m(
                40,
                'retry',
                'Retry deposit',
                'Retry cleared the failed input marker and returned to the wallet action.',
                snapshot(),
                SwapPhase.AwaitingUserDeposit,
            ),
        ],
    },
    {
        id: 'output-failure',
        label: 'Output failure',
        group: 'wallet-transfer',
        section: 'outcomes',
        milestones: [
            pendingInput,
            confirmed,
            m(
                70,
                'failed',
                'Output failed',
                'The deposit is confirmed but the output transfer failed.',
                processing({ status: SwapStatus.Failed }),
                SwapPhase.Failed,
            ),
        ],
    },
    ...(['below-minimum', 'above-maximum'] as const).map(
        (id): TimelineScenario => ({
            id,
            group: 'wallet-transfer',
            section: 'outcomes',
            label:
                id === 'below-minimum'
                    ? 'Deposit below minimum'
                    : 'Deposit above maximum — hold',
            milestones: [
                ready,
                m(
                    20,
                    'detected',
                    'Deposit detected',
                    'The deposited amount differs from the requested amount.',
                    processing({
                        transactions: [
                            transaction(TransactionType.Input, {
                                amount: id === 'below-minimum' ? 0.1 : 100_000,
                                confirmations: 2,
                            }),
                        ],
                    }),
                    SwapPhase.InputPending,
                ),
                m(
                    40,
                    'limit',
                    id === 'below-minimum'
                        ? 'Below minimum'
                        : 'Transfer on hold',
                    'The confirmed deposit is outside the allowed range.',
                    processing({
                        status: SwapStatus.Failed,
                        fail_reason:
                            id === 'below-minimum'
                                ? 'received_less_than_valid_range'
                                : 'received_more_than_valid_range',
                        transactions: [
                            transaction(TransactionType.Input, {
                                amount: id === 'below-minimum' ? 0.1 : 100_000,
                            }),
                        ],
                    }),
                    SwapPhase.Failed,
                ),
            ],
        }),
    ),
    {
        id: 'expired',
        label: 'Deposit window expires',
        group: 'wallet-transfer',
        section: 'outcomes',
        milestones: [
            ready,
            m(
                600,
                'expired',
                'Transfer expired',
                'No deposit arrived before the transfer deadline.',
                snapshot({ details: details({ status: SwapStatus.Expired }) }),
                SwapPhase.Expired,
            ),
        ],
    },
    {
        id: 'refund',
        label: 'Pending refund → refunded',
        group: 'wallet-transfer',
        section: 'outcomes',
        milestones: [
            pendingInput,
            confirmed,
            m(
                70,
                'refund-pending',
                'Processing refund',
                'The output could not be completed. The full deposit will be returned.',
                processing({ status: SwapStatus.PendingRefund }),
                SwapPhase.PendingRefund,
            ),
            m(
                120,
                'refunded',
                'Refund complete',
                'The refund transaction is published and the deposit has been returned.',
                processing({
                    status: SwapStatus.Refunded,
                    transactions: [
                        input,
                        transaction(TransactionType.Refund, {
                            amount: 100,
                            timestamp: date(120),
                        }),
                    ],
                }),
                SwapPhase.Refunded,
            ),
        ],
    },
];
const walletErrors: Array<[string, string, ActionMessageType | 'unknown']> = [
    ['rejected', 'Transaction rejected', ActionMessageType.TransactionRejected],
    ['failed', 'Wallet transfer failed', ActionMessageType.TransactionFailed],
    [
        'expired',
        'Transfer details expired',
        ActionMessageType.TransactionExpired,
    ],
    ['funds', 'Insufficient wallet funds', ActionMessageType.InsufficientFunds],
    ['mismatch', 'Wallet account mismatch', ActionMessageType.WaletMismatch],
    ['unknown', 'Unknown wallet error', 'unknown'],
];
const walletScenarios: TimelineScenario[] = [
    {
        id: 'wallet-connect',
        label: 'Connect wallet and recover',
        group: 'wallet-transfer',
        section: 'wallet-setup',
        milestones: [
            milestoneWallet(
                0,
                'disconnected',
                'Wallet disconnected',
                'A wallet connection is required.',
                { kind: 'connect' },
            ),
            milestoneWallet(
                5,
                'connecting',
                'Connecting wallet',
                'A connection request is pending.',
                { kind: 'connect', pending: true },
            ),
            milestoneWallet(
                12,
                'error',
                'Connection failed',
                'The wallet declined the connection request.',
                {
                    kind: 'connect',
                    error: 'Connection request rejected. Please try again.',
                },
            ),
            milestoneWallet(
                20,
                'connected',
                'Wallet connected',
                'The source wallet is now available.',
                { kind: 'send' },
            ),
        ],
    },
    {
        id: 'wallet-network',
        label: 'Switch network and recover',
        group: 'wallet-transfer',
        section: 'wallet-setup',
        milestones: [
            milestoneWallet(
                0,
                'required',
                'Switch network',
                'The connected wallet is on a different network.',
                { kind: 'network' },
            ),
            milestoneWallet(
                5,
                'pending',
                'Confirm network switch',
                'The wallet is waiting for network-switch approval.',
                { kind: 'network', pending: true },
            ),
            milestoneWallet(
                12,
                'error',
                'Network switch failed',
                'The wallet rejected the network switch.',
                { kind: 'network', error: 'The request was rejected.' },
            ),
            milestoneWallet(
                20,
                'correct',
                'Correct network',
                'The source network now matches the wallet.',
                { kind: 'send' },
            ),
        ],
    },
    ...walletErrors.map(
        ([id, label, error]): TimelineScenario => ({
            id: `wallet-${id}`,
            label,
            group: 'wallet-transfer',
            section: 'errors-and-retries',
            milestones: [
                ready,
                milestoneWallet(
                    5,
                    'confirm',
                    'Confirm in wallet',
                    'The wallet has received the transaction request.',
                    {
                        kind: 'send',
                        pending: true,
                        label: 'Confirm in your wallet',
                    },
                ),
                milestoneWallet(
                    12,
                    'error',
                    label,
                    'The wallet reports an error; the user can retry.',
                    { kind: 'send', error },
                ),
                ...(error === 'unknown'
                    ? [
                          milestoneWallet(
                              16,
                              'details',
                              'Error details expanded',
                              'Troubleshooting instructions are expanded.',
                              { kind: 'send', error, errorExpanded: true },
                          ),
                      ]
                    : []),
                milestoneWallet(
                    25,
                    'retry',
                    'Retry preparation',
                    'Retry starts preparing fresh transfer details.',
                    {
                        kind: 'send',
                        pending: true,
                        label:
                            error === ActionMessageType.TransactionExpired
                                ? 'Refreshing transfer'
                                : 'Preparing',
                    },
                ),
            ],
        }),
    ),
    {
        id: 'same-account',
        label: 'Same-account restriction',
        group: 'wallet-transfer',
        section: 'wallet-setup',
        milestones: [
            milestoneWallet(
                0,
                'mismatch',
                'Different accounts',
                'This route requires the same source and destination account.',
                { kind: 'account-mismatch' },
            ),
            milestoneWallet(
                20,
                'matched',
                'Accounts match',
                'The destination now matches the source account.',
                { kind: 'send' },
                { swap: { ...snapshot().swap, destination_address: account } },
            ),
        ],
    },
    {
        id: 'balance',
        label: 'Insufficient balance and refresh',
        group: 'wallet-transfer',
        section: 'quotes-and-balances',
        milestones: [
            m(
                0,
                'insufficient',
                'Insufficient balance',
                'The selected account only holds 25 USDC.',
                snapshot({ balanceWarning: { kind: 'balance', amount: 25 } }),
            ),
            m(
                5,
                'refresh',
                'Refreshing balance',
                'The balance refresh is in progress.',
                snapshot({
                    balanceWarning: {
                        kind: 'balance',
                        amount: 25,
                        refreshing: true,
                    },
                }),
            ),
            m(
                15,
                'funded',
                'Balance available',
                'The updated balance is sufficient to continue.',
                snapshot(),
            ),
        ],
    },
];
const quoteScenarios: TimelineScenario[] = [
    {
        id: 'quote-loading',
        label: 'Quote loading and error',
        group: 'wallet-transfer',
        section: 'quotes-and-balances',
        milestones: [
            m(
                0,
                'loading',
                'Loading quote',
                'The initial quote is loading.',
                snapshot({
                    quote: undefined,
                    quoteState: { status: 'loading', expanded: false },
                }),
            ),
            m(
                8,
                'error',
                'Quote unavailable',
                'The quote request failed and sending is disabled.',
                snapshot({
                    quote: undefined,
                    quoteState: { status: 'error', expanded: false },
                }),
            ),
            m(
                20,
                'ready',
                'Quote ready',
                'A new quote was received.',
                snapshot(),
            ),
            m(
                25,
                'expanded',
                'Quote details expanded',
                'Fees, rate and estimated time are visible.',
                snapshot({
                    quoteState: {
                        status: 'ready',
                        expanded: true,
                        gasFeeInUsd: 0.42,
                    },
                }),
            ),
        ],
    },
    {
        id: 'quote-update',
        label: 'Quote update during preparation',
        group: 'wallet-transfer',
        section: 'quotes-and-balances',
        milestones: [
            ready,
            milestoneWallet(
                5,
                'updating',
                'Updating quotes',
                'Preparation returned a changed receiving amount.',
                { kind: 'send', pending: true, label: 'Updating quotes' },
                {
                    quote: {
                        ...quote,
                        receive_amount: 96,
                        min_receive_amount: 95.5,
                    },
                    quoteState: { status: 'loading', expanded: false },
                },
            ),
            milestoneWallet(
                9,
                'opening',
                'Opening wallet',
                'The refreshed quote is ready for approval.',
                { kind: 'send', pending: true, label: 'Opening Wallet' },
                {
                    quote: {
                        ...quote,
                        receive_amount: 96,
                        min_receive_amount: 95.5,
                    },
                },
            ),
        ],
    },
    {
        id: 'critical-quote',
        label: 'Critical receiving amount',
        group: 'wallet-transfer',
        section: 'quotes-and-balances',
        milestones: [
            milestoneWallet(
                0,
                'warning',
                'Critical receiving amount',
                'High price impact affects the minimum received.',
                { kind: 'send', critical: 'warning' },
                {
                    quote: {
                        ...quote,
                        receive_amount: 80,
                        min_receive_amount: 75,
                    },
                },
            ),
            milestoneWallet(
                8,
                'confirmation',
                'Confirm receiving amount',
                'The created swap requires explicit confirmation of the lower amount.',
                { kind: 'send', critical: 'confirmation' },
                {
                    quote: {
                        ...quote,
                        receive_amount: 80,
                        min_receive_amount: 75,
                    },
                },
            ),
            milestoneWallet(
                15,
                'confirmed',
                'Confirm in wallet',
                'The user accepted the critical receiving amount.',
                {
                    kind: 'send',
                    pending: true,
                    label: 'Confirm in your wallet',
                },
                {
                    quote: {
                        ...quote,
                        receive_amount: 80,
                        min_receive_amount: 75,
                    },
                },
            ),
        ],
    },
    {
        id: 'insufficient-gas',
        label: 'Insufficient balance for gas',
        group: 'wallet-transfer',
        section: 'quotes-and-balances',
        milestones: [
            m(
                0,
                'gas',
                'Insufficient gas',
                'The wallet needs a balance remaining for the network fee.',
                snapshot({
                    swap: {
                        ...snapshot().swap,
                        source_token: eth,
                        requested_amount: '0.04',
                    },
                    quote: {
                        ...quote,
                        source_token: eth,
                        requested_amount: 0.04,
                        rate: 2500,
                    },
                    balanceWarning: { kind: 'gas' },
                }),
            ),
            m(
                10,
                'adjusted',
                'Amount adjusted',
                'The send amount was reduced to leave enough for gas.',
                snapshot({
                    swap: {
                        ...snapshot().swap,
                        source_token: eth,
                        requested_amount: '0.0398',
                    },
                    quote: {
                        ...quote,
                        source_token: eth,
                        requested_amount: 0.0398,
                        receive_amount: 98.5,
                        min_receive_amount: 98,
                        rate: 2500,
                    },
                }),
            ),
        ],
    },
];
const manual = (exchange = false, patch: Partial<Page2LoadedSnapshot> = {}) =>
    snapshot({
        swap: {
            ...snapshot().swap,
            use_deposit_address: true,
            source_exchange: exchange
                ? {
                      name: 'BINANCE',
                      display_name: 'Binance',
                      logo: icon('B', '#b6920b'),
                      metadata: { o_auth: null },
                  }
                : undefined,
        },
        manual: { loading: false, address: deposit },
        ...patch,
    });
const manualScenarios = [false, true].map(
    (exchange): TimelineScenario => ({
        id: exchange ? 'manual-exchange' : 'manual-network',
        label: exchange
            ? 'Manual deposit from exchange'
            : 'Manual deposit from network',
        group: 'manual-deposit',
        section: 'main-flow',
        milestones: [
            m(
                0,
                'loading',
                'Loading instructions',
                exchange
                    ? 'Available exchange withdrawal networks are loading.'
                    : 'Deposit instructions are being prepared.',
                manual(exchange, { manual: { loading: true } }),
            ),
            m(
                5,
                'address-pending',
                'Deposit address pending',
                'The route is ready; the deposit address has not arrived.',
                manual(exchange, { manual: { loading: false } }),
            ),
            m(
                12,
                'address-ready',
                'Deposit address ready',
                'The address and expected received amount are displayed.',
                manual(exchange),
            ),
            m(
                20,
                'details',
                'Deposit details expanded',
                'The quote details are expanded.',
                manual(exchange, {
                    quoteState: { status: 'ready', expanded: true },
                }),
            ),
            m(
                40,
                'deposit-detected',
                'Deposit detected',
                'The manual deposit was found and is confirming.',
                manual(exchange, {
                    details: details({
                        transactions: [
                            transaction(TransactionType.Input, {
                                timestamp: date(40),
                                confirmations: 2,
                            }),
                        ],
                    }),
                }),
                SwapPhase.InputPending,
            ),
        ],
    }),
);
const gaslessBase = (patch: Partial<Page2LoadedSnapshot> = {}) =>
    snapshot({
        quoteState: { status: 'ready', expanded: false, gasless: true },
        ...patch,
    });
const gaslessScenarios: TimelineScenario[] = [
    {
        id: 'gasless-success',
        label: 'Gasless signing and publishing',
        group: 'gasless',
        section: 'main-flow',
        milestones: [
            m(
                0,
                'ready',
                'Gasless ready',
                'The paymaster covers the source network fee.',
                gaslessBase(),
            ),
            m(
                5,
                'signing',
                'Sign in wallet',
                'The wallet is signing the gasless authorization.',
                gaslessBase({
                    wallet: {
                        kind: 'send',
                        pending: true,
                        label: 'Sign in wallet',
                    },
                }),
            ),
            m(
                12,
                'publishing',
                'Authorization accepted',
                'Authorization is accepted; the input has not been broadcast.',
                gaslessBase({
                    gaslessAuthorization: { status: 'initiated' },
                    storedWalletTransaction: { ...stored, hash: '' },
                }),
                SwapPhase.InputPending,
            ),
            m(
                20,
                'published',
                'Gasless deposit published',
                'Authorization polling supplies the input hash and confirmations.',
                gaslessBase({
                    gaslessAuthorization: {
                        status: 'published',
                        transaction: {
                            transaction_hash: hash,
                            status: BackendTransactionStatus.Pending,
                            confirmations: 2,
                            max_confirmations: 12,
                        },
                    },
                    storedWalletTransaction: { ...stored, hash: '' },
                }),
                SwapPhase.InputPending,
            ),
            m(
                40,
                'input',
                'Deposit confirmed',
                'The swap input transaction is now available.',
                gaslessBase({ details: details({ transactions: [input] }) }),
                SwapPhase.OutputPending,
            ),
            {
                ...completed,
                snapshot: gaslessBase({
                    details: details({
                        status: SwapStatus.Completed,
                        transactions: [input, output],
                    }),
                }),
            },
        ],
    },
    ...(['expired', 'insufficient', 'rejected'] as const).map(
        (status): TimelineScenario => ({
            id: `gasless-${status}`,
            label: `Gasless authorization ${status}`,
            group: 'gasless',
            section: 'errors-and-retries',
            milestones: [
                m(
                    0,
                    'signing',
                    'Sign in wallet',
                    'The wallet is asked to authorize the deposit.',
                    gaslessBase({
                        wallet: {
                            kind: 'send',
                            pending: true,
                            label: 'Sign in wallet',
                        },
                    }),
                ),
                m(
                    10,
                    'pending',
                    'Authorization pending',
                    'The signed deposit is waiting to be published.',
                    gaslessBase({
                        gaslessAuthorization: { status: 'initiated' },
                        storedWalletTransaction: { ...stored, hash: '' },
                    }),
                    SwapPhase.InputPending,
                ),
                m(
                    45,
                    'failed',
                    `Authorization ${status}`,
                    'Authorization failed without publishing an input transaction. Retry and standard transfer are available.',
                    gaslessBase({
                        gaslessAuthorization: { status },
                        storedWalletTransaction: { ...stored, hash: '' },
                    }),
                    SwapPhase.Failed,
                ),
                m(
                    55,
                    'retry',
                    'Retry gasless deposit',
                    'Retry removed the authorization and deposit markers.',
                    gaslessBase(),
                ),
                m(
                    65,
                    'standard',
                    'Standard transfer selected',
                    'The source gas fee is now paid by the wallet.',
                    snapshot(),
                ),
            ],
        }),
    ),
    {
        id: 'gasless-unavailable',
        label: 'Gasless unavailable and fallback',
        group: 'gasless',
        section: 'errors-and-retries',
        milestones: [
            m(
                0,
                'ready',
                'Gasless ready',
                'The selected route initially offers gasless transfer.',
                gaslessBase(),
            ),
            m(
                5,
                'unavailable',
                'Gasless unavailable',
                'Swap creation reports that the gasless route is unavailable.',
                gaslessBase({
                    wallet: {
                        kind: 'send',
                        gaslessUnavailable: true,
                        gaslessFailureStage: 'create',
                    },
                }),
            ),
            m(
                15,
                'standard',
                'Standard transfer',
                'The standard transfer action is available.',
                snapshot(),
            ),
        ],
    },
    {
        id: 'gasless-submit-failed',
        label: 'Gasless submission failure',
        group: 'gasless',
        section: 'errors-and-retries',
        milestones: [
            m(
                0,
                'signing',
                'Sign in wallet',
                'The user signs a deposit authorization.',
                gaslessBase({
                    wallet: {
                        kind: 'send',
                        pending: true,
                        label: 'Sign in wallet',
                    },
                }),
            ),
            m(
                8,
                'failed',
                'Gasless deposit failed',
                'Submission of the signed authorization failed. Retry or use standard transfer.',
                gaslessBase({
                    wallet: {
                        kind: 'send',
                        gaslessUnavailable: true,
                        gaslessFailureStage: 'deposit',
                        gaslessMessage:
                            'The gasless deposit could not be completed.',
                    },
                }),
            ),
            m(
                15,
                'retry',
                'Retry signing',
                'A fresh authorization is requested.',
                gaslessBase({
                    wallet: {
                        kind: 'send',
                        pending: true,
                        label: 'Sign in wallet',
                    },
                }),
            ),
        ],
    },
];
const specialized = (
    provider: 'Hyperliquid' | 'Polymarket',
    wallet: Partial<Extract<Page2WalletState, { kind: 'specialized' }>> = {},
) => {
    const network: Network = {
        ...ethereum,
        type:
            provider === 'Hyperliquid'
                ? NetworkType.Hyperliquid
                : NetworkType.Polymarket,
        name: `${provider.toUpperCase()}_MAINNET`,
        display_name: provider,
        logo: icon(
            provider[0],
            provider === 'Hyperliquid' ? '#178a76' : '#315de6',
        ),
    };
    return snapshot({
        swap: {
            ...snapshot().swap,
            source_network: network,
        },
        quote: { ...quote, source_network: network },
        wallet: { kind: 'specialized', provider, connected: true, ...wallet },
    });
};
const specializedScenarios = (['Hyperliquid', 'Polymarket'] as const).flatMap(
    (provider): TimelineScenario[] => [
        {
            id: `${provider}-withdraw`,
            label: `${provider} withdrawal`,
            group: provider === 'Hyperliquid' ? 'hyperliquid' : 'polymarket',
            section: 'main-flow',
            milestones: [
                m(
                    0,
                    'connect',
                    'Connect account',
                    'Connect the wallet that owns the withdrawal balance.',
                    specialized(provider, { connected: false }),
                ),
                m(
                    8,
                    'mismatch',
                    'Account mismatch',
                    'The active account differs from the swap source account.',
                    specialized(provider, { accountMismatch: true }),
                ),
                m(
                    15,
                    'ready',
                    'Ready to withdraw',
                    'The selected account owns the balance.',
                    specialized(provider),
                ),
                m(
                    20,
                    'prerequisite',
                    provider === 'Hyperliquid'
                        ? 'Approve moving your balance'
                        : 'Setting up your account',
                    'A provider prerequisite must complete before withdrawal.',
                    specialized(provider, {
                        pending: true,
                        progress:
                            provider === 'Hyperliquid'
                                ? {
                                      title: 'Approve moving your balance',
                                      description:
                                          'Moving 100 USDC from your Hyperliquid Spot balance to Perps so this withdrawal can be funded. The funds stay on Hyperliquid and there’s no fee — you’ll approve the withdrawal itself next.',
                                  }
                                : {
                                      title: 'Setting up your account',
                                      description:
                                          'Preparing your Polymarket wallet. This usually takes a few seconds…',
                                  },
                    }),
                ),
                ...(provider === 'Hyperliquid'
                    ? [
                          m(
                              25,
                              'updating',
                              'Updating balance',
                              'The approved Spot-to-Perps move is being applied.',
                              specialized(provider, {
                                  pending: true,
                                  progress: {
                                      title: 'Updating your balance',
                                      description:
                                          'Applying the move on Hyperliquid. This usually takes a few seconds…',
                                  },
                              }),
                          ),
                      ]
                    : []),
                m(
                    35,
                    'withdrawing',
                    'Withdrawing',
                    'Prerequisites are complete and withdrawal is in progress.',
                    specialized(provider, { pending: true }),
                ),
                m(
                    50,
                    'published',
                    'Withdrawal published',
                    'The withdrawal hash was returned and the swap is processing.',
                    {
                        ...specialized(provider),
                        storedWalletTransaction: stored,
                    },
                    SwapPhase.InputPending,
                ),
            ],
        },
        {
            id: `${provider}-rejected`,
            label: `${provider} rejection`,
            group: provider === 'Hyperliquid' ? 'hyperliquid' : 'polymarket',
            section: 'errors-and-retries',
            milestones: [
                m(
                    0,
                    'ready',
                    'Ready to withdraw',
                    'The withdrawal can be initiated.',
                    specialized(provider),
                ),
                m(
                    5,
                    'pending',
                    'Withdrawing',
                    'The withdrawal approval is pending.',
                    specialized(provider, { pending: true }),
                ),
                m(
                    12,
                    'rejected',
                    'Withdrawal rejected',
                    'The user rejected the wallet request.',
                    specialized(provider, { rejected: true }),
                ),
                m(
                    20,
                    'retry',
                    'Retry withdrawal',
                    'A fresh withdrawal request is pending.',
                    specialized(provider, { pending: true }),
                ),
            ],
        },
        ...[
            {
                header: 'Wrong network',
                details: `Switch your wallet to ${provider === 'Hyperliquid' ? 'Ethereum' : 'Polygon'} to sign the withdrawal, then try again.`,
            },
            {
                header: 'Insufficient balance',
                details: `Your available ${provider} balance (25 USDC) is below the withdrawal amount.`,
            },
            provider === 'Hyperliquid'
                ? {
                      header: 'Balance is updating',
                      details:
                          'Your funds are moving between your Hyperliquid balances. Please try again in a moment.',
                  }
                : {
                      header: 'Unsupported account',
                      details:
                          'This Polymarket account type isn’t supported for direct withdrawal. Withdraw via Polymarket, or use an account backed by a browser wallet.',
                  },
            {
                header: 'Withdrawal failed',
                details: 'Unexpected error occurred.',
            },
        ].map(
            (error, i): TimelineScenario => ({
                id: `${provider}-error-${i}`,
                label: `${provider}: ${error.header.toLowerCase()}`,
                group:
                    provider === 'Hyperliquid' ? 'hyperliquid' : 'polymarket',
                section: 'errors-and-retries',
                milestones: [
                    m(
                        0,
                        'ready',
                        'Ready to withdraw',
                        'The source account is connected.',
                        specialized(provider),
                    ),
                    m(
                        5,
                        'error',
                        error.header,
                        'The withdrawal provider reports an error.',
                        specialized(provider, { error }),
                    ),
                    m(
                        15,
                        'retry',
                        'Retry withdrawal',
                        'The user tries the withdrawal again.',
                        specialized(provider, { pending: true }),
                    ),
                ],
            }),
        ),
    ],
);
const supporting: TimelineScenario[] = [
    {
        id: 'initial-loading',
        label: 'Initial loading → ready',
        group: 'page-states',
        section: 'main-flow',
        milestones: [
            m(0, 'loading', 'Loading swap', 'Swap data has not arrived.', {
                kind: 'loading',
            }),
            { ...ready, at: 5 },
        ],
    },
    {
        id: 'not-found',
        label: 'Swap not found',
        group: 'page-states',
        section: 'main-flow',
        milestones: [
            m(
                0,
                'loading',
                'Loading swap',
                'The requested swap is being loaded.',
                { kind: 'loading' },
            ),
            m(
                5,
                'not-found',
                'Swap not found',
                'The requested swap could not be found.',
                { kind: 'not-found' },
            ),
        ],
    },
    {
        id: 'swap-error',
        label: 'Swap creation error',
        group: 'wallet-transfer',
        section: 'errors-and-retries',
        milestones: [
            ready,
            milestoneWallet(
                5,
                'error',
                'Something went wrong',
                'Swap preparation failed and the error panel is shown.',
                { kind: 'send', swapError: true },
            ),
        ],
    },
    {
        id: 'rpc',
        label: 'RPC warning and update',
        group: 'wallet-transfer',
        section: 'wallet-setup',
        milestones: [
            m(
                0,
                'unhealthy',
                'Wallet RPC unhealthy',
                'Wallet network requests are failing.',
                snapshot({ rpc: { pending: false, status: 'idle' } }),
            ),
            m(
                5,
                'confirm',
                'Confirm RPC update',
                'The wallet is waiting for the RPC change to be approved.',
                snapshot({ rpc: { pending: true, status: 'idle' } }),
            ),
            m(
                12,
                'error',
                'RPC update failed',
                'The RPC could not be added automatically; manual instructions are shown.',
                snapshot({ rpc: { pending: false, status: 'error' } }),
            ),
            m(
                20,
                'success',
                'RPC added',
                'The RPC was added; the user must select it in the wallet.',
                snapshot({ rpc: { pending: false, status: 'success' } }),
            ),
            m(
                30,
                'healthy',
                'RPC healthy',
                'The wallet is ready to transfer.',
                snapshot(),
            ),
        ],
    },
];
// The backend owns these actions. Snapshots preserve its order/status while the
// wallet fields represent the prompt or error currently shown by the controller.
const frontendToken: Token = {
    ...usdc,
    supports_gasless_deposit: true,
    gasless_standard: 'permit2',
};
const frontendQuote: SwapQuote = {
    ...quote,
    source_network: base,
    destination_network: base,
    source_token: frontendToken,
    destination_token: eth,
    receive_amount: 0.0396,
    min_receive_amount: 0.0394,
    rate: 0.0004,
};
const frontend = (
    patch: Partial<Page2LoadedSnapshot> = {},
): Page2LoadedSnapshot =>
    snapshot({
        swap: {
            ...snapshot().swap,
            source_network: base,
            destination_network: base,
            source_token: frontendToken,
            destination_token: eth,
        },
        swapId: details().id,
        quote: frontendQuote,
        ...patch,
    });
type WorkflowStep = 'approve_permit2' | 'sign' | 'publish' | 'deposit';
type WorkflowStatus =
    | 'action_required'
    | 'pending'
    | 'waiting'
    | 'completed'
    | 'failed';
const workflow = (
    entries: [WorkflowStep, WorkflowStatus, string?][],
): DepositAction[] =>
    entries.map(([step, status, detail], order) => {
        const common = {
            step,
            status,
            detail,
            order,
            network: base,
            token: frontendToken,
            expires_at: date(600),
        };
        if (status === 'waiting') return common;
        if (step === 'sign')
            return {
                ...common,
                type: 'sign',
                typed_data: {
                    types: {
                        Swap: [
                            { name: 'owner', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                        ],
                    },
                    primaryType: 'Swap',
                    domain: {
                        name: 'Sample Swap',
                        chainId: 8453,
                        verifyingContract: deposit,
                    },
                    message: { owner: account, amount: '100000000' },
                },
                valid_before: Math.floor(EPOCH / 1000) + 600,
            };
        return {
            ...common,
            type: 'transfer',
            amount: 100,
            amount_in_base_units: '100000000',
            from_address: account,
            to_address: deposit,
            call_data: '0x',
        };
    });
const approvalRequired = workflow([
    ['approve_permit2', 'action_required'],
    ['sign', 'waiting'],
    ['publish', 'waiting'],
]);
const approvalPending = workflow([
    ['approve_permit2', 'pending'],
    ['sign', 'waiting'],
    ['publish', 'waiting'],
]);
const signatureRequired = workflow([
    ['approve_permit2', 'completed'],
    ['sign', 'action_required'],
    ['publish', 'waiting'],
]);
const publishWaiting = workflow([
    ['approve_permit2', 'completed'],
    ['sign', 'completed'],
    ['publish', 'waiting'],
]);
const publishRequired = workflow([
    ['approve_permit2', 'completed'],
    ['sign', 'completed'],
    ['publish', 'action_required'],
]);
const workflowComplete = workflow([
    ['approve_permit2', 'completed'],
    ['sign', 'completed'],
    ['publish', 'completed'],
]);
const frontendMilestone = (
    at: number,
    id: string,
    label: string,
    description: string,
    actions: DepositAction[] | undefined,
    wallet: Page2WalletState,
    extra: Partial<Page2LoadedSnapshot> = {},
    expectedPhase = SwapPhase.AwaitingUserDeposit,
) =>
    m(
        at,
        id,
        label,
        description,
        frontend({ depositActions: actions, wallet, ...extra }),
        expectedPhase,
    );
const frontendCompleted = (inputAt = 20) =>
    frontendMilestone(
        90,
        'completed',
        'Swap completed',
        'The shared inline header keeps the small gauge and Transfer complete on the left, with completion time on the right. Completed steps remain visible, with the explorer link on the receive step; quote details and action buttons are hidden.',
        workflowComplete,
        { kind: 'send' },
        {
            details: details({
                status: SwapStatus.Completed,
                transactions: [
                    transaction(TransactionType.Input, {
                        timestamp: date(inputAt),
                        created_date: date(inputAt),
                    }),
                    transaction(TransactionType.Output, {
                        amount: 0.0396,
                        timestamp: date(90),
                    }),
                ],
            }),
        },
        SwapPhase.Completed,
    );
const nativeFrontendState: Partial<Page2LoadedSnapshot> = {
    swap: {
        ...frontend().swap,
        source_token: eth,
        destination_token: usdc,
        requested_amount: '0.04',
    },
    quote: {
        ...frontendQuote,
        source_token: eth,
        destination_token: usdc,
        requested_amount: 0.04,
        receive_amount: 99,
        min_receive_amount: 98.5,
        rate: 2500,
    },
};
const gaslessFrontendToken: Token = {
    ...usdc,
    supports_gasless_deposit: true,
    gasless_standard: 'eip3009',
};
const gaslessFrontendState: Partial<Page2LoadedSnapshot> = {
    swap: { ...frontend().swap, source_token: gaslessFrontendToken },
    quote: { ...frontendQuote, source_token: gaslessFrontendToken },
    quoteState: { status: 'ready', expanded: false, gasless: true },
};
const gaslessFrontendActions = workflow([['sign', 'action_required']]).map(
    (action) => ({ ...action, token: gaslessFrontendToken }),
);
const frontendScenarios: TimelineScenario[] = [
    {
        id: 'frontend-permit2',
        label: 'Approve, sign and confirm',
        group: 'token-swap',
        section: 'main-flow',
        milestones: [
            frontendMilestone(
                0,
                'ready',
                'Quote ready',
                'Before swap creation, the full quote includes gas and expandable details.',
                undefined,
                { kind: 'send' },
                { swapId: undefined },
            ),
            frontendMilestone(
                3,
                'preparing',
                'Preparing swap',
                'Creating the swap while the full quote remains visible.',
                undefined,
                { kind: 'send', pending: true, label: 'Preparing swap…' },
                { swapId: undefined },
            ),
            frontendMilestone(
                5,
                'approving',
                'Approve in wallet',
                'Creating the swap opens the approval prompt automatically and makes the quote compact.',
                approvalRequired,
                {
                    kind: 'send',
                    pending: true,
                    label: 'Approve in your wallet',
                },
            ),
            frontendMilestone(
                15,
                'approval-pending',
                'Confirming approval',
                'Approval is pending on-chain; it is not recorded as the swap deposit.',
                approvalPending,
                { kind: 'send', pending: true, label: 'Confirming approval…' },
            ),
            frontendMilestone(
                25,
                'signing',
                'Sign in wallet',
                'After approval confirms, the signature prompt opens automatically; approval stays checked.',
                signatureRequired,
                { kind: 'send', pending: true, label: 'Sign in your wallet' },
            ),
            frontendMilestone(
                35,
                'prepare-publish',
                'Preparing transaction',
                'The signature is accepted; the backend is preparing publication.',
                publishWaiting,
                {
                    kind: 'send',
                    pending: true,
                    label: 'Preparing transaction…',
                },
            ),
            frontendMilestone(
                40,
                'publishing',
                'Confirm in wallet',
                'Once publication is prepared, the final wallet prompt opens automatically.',
                publishRequired,
                {
                    kind: 'send',
                    pending: true,
                    label: 'Confirm in your wallet',
                },
            ),
            frontendMilestone(
                50,
                'input',
                'Confirming swap transaction',
                'The same timeline keeps approval and signing checked while the swap transaction confirms.',
                workflowComplete,
                { kind: 'send' },
                {
                    storedWalletTransaction: {
                        ...stored,
                        timestamp: EPOCH + 50_000,
                    },
                    details: details({
                        transactions: [
                            transaction(TransactionType.Input, {
                                confirmations: 3,
                                timestamp: date(50),
                                created_date: date(50),
                            }),
                        ],
                    }),
                },
                SwapPhase.InputPending,
            ),
            frontendMilestone(
                70,
                'finalizing',
                'Finalizing swap',
                'The deposit is confirmed. The fourth timeline step stays active until the output arrives.',
                workflowComplete,
                { kind: 'send' },
                {
                    details: details({
                        status: SwapStatus.Completed,
                        transactions: [
                            transaction(TransactionType.Input, {
                                timestamp: date(50),
                                created_date: date(50),
                            }),
                        ],
                    }),
                },
                SwapPhase.SettlingOutput,
            ),
            frontendCompleted(50),
        ],
    },
    {
        id: 'frontend-approved',
        label: 'Token already approved',
        group: 'token-swap',
        section: 'main-flow',
        milestones: [
            frontendMilestone(
                0,
                'signing',
                'Sign in wallet',
                'Existing allowance skips approval and opens the signature prompt automatically.',
                signatureRequired.slice(1),
                { kind: 'send', pending: true, label: 'Sign in your wallet' },
            ),
            frontendMilestone(
                15,
                'publish',
                'Confirm in wallet',
                'After signing, the final wallet prompt opens automatically.',
                publishRequired.slice(1),
                {
                    kind: 'send',
                    pending: true,
                    label: 'Confirm in your wallet',
                },
            ),
            frontendMilestone(
                25,
                'input',
                'Confirming swap transaction',
                'Publication stores the transaction hash and moves directly to processing.',
                workflowComplete.slice(1),
                { kind: 'send' },
                {
                    storedWalletTransaction: {
                        ...stored,
                        timestamp: EPOCH + 25_000,
                    },
                    details: details({
                        transactions: [
                            transaction(TransactionType.Input, {
                                confirmations: 3,
                                timestamp: date(25),
                                created_date: date(25),
                            }),
                        ],
                    }),
                },
                SwapPhase.InputPending,
            ),
            frontendCompleted(25),
        ],
    },
    {
        id: 'frontend-native',
        label: 'Native token swap',
        group: 'token-swap',
        section: 'main-flow',
        milestones: [
            frontendMilestone(
                0,
                'ready',
                'Quote ready',
                'The native-token quote is ready to start the swap.',
                undefined,
                { kind: 'send' },
                { ...nativeFrontendState, swapId: undefined },
            ),
            frontendMilestone(
                5,
                'publishing',
                'Confirm in wallet',
                'Starting the swap opens its only wallet prompt automatically, without approval or signature steps.',
                workflow([['publish', 'action_required']]).map((action) => ({
                    ...action,
                    token: eth,
                    amount: 0.04,
                    amount_in_base_units: '40000000000000000',
                })),
                {
                    kind: 'send',
                    pending: true,
                    label: 'Confirm in your wallet',
                },
                nativeFrontendState,
            ),
        ],
    },
    ...(['approve_permit2', 'sign', 'publish'] as const).map(
        (step): TimelineScenario => {
            const actions =
                step === 'approve_permit2'
                    ? approvalRequired
                    : step === 'sign'
                      ? signatureRequired
                      : publishRequired;
            const label =
                step === 'approve_permit2'
                    ? 'approval'
                    : step === 'sign'
                      ? 'signature'
                      : 'publication';
            const prompt =
                step === 'approve_permit2'
                    ? 'Approve in your wallet'
                    : step === 'sign'
                      ? 'Sign in your wallet'
                      : 'Confirm in your wallet';
            return {
                id: `frontend-${step}-retry`,
                label: `${label[0].toUpperCase()}${label.slice(1)} rejected and retried`,
                group: 'token-swap',
                section: 'errors-and-retries',
                milestones: [
                    frontendMilestone(
                        0,
                        'prompt',
                        'Wallet prompt',
                        `The ${label} step is awaiting wallet confirmation.`,
                        actions,
                        { kind: 'send', pending: true, label: prompt },
                    ),
                    frontendMilestone(
                        5,
                        'rejected',
                        'Wallet request rejected',
                        'The current step fails visually; completed prerequisites and the same swap are retained.',
                        actions,
                        {
                            kind: 'send',
                            error: ActionMessageType.TransactionRejected,
                            isSignatureError: step === 'sign',
                        },
                    ),
                    frontendMilestone(
                        10,
                        'refresh',
                        'Refreshing swap',
                        'Retry clears the rejection and fetches fresh action data without losing prior steps.',
                        actions,
                        {
                            kind: 'send',
                            pending: true,
                            label: 'Refreshing swap…',
                        },
                    ),
                    frontendMilestone(
                        15,
                        'retry',
                        'Fresh wallet prompt',
                        'Fresh payloads are presented for the same current step.',
                        actions.map((action) => ({
                            ...action,
                            expires_at: date(900),
                        })),
                        { kind: 'send', pending: true, label: prompt },
                    ),
                    frontendCompleted(),
                ],
            };
        },
    ),
    {
        id: 'frontend-errors',
        label: 'Workflow failures and refresh',
        group: 'token-swap',
        section: 'errors-and-retries',
        milestones: [
            frontendMilestone(
                0,
                'ready',
                'Approve in wallet',
                'The approval prompt opens automatically before authorization.',
                approvalRequired,
                {
                    kind: 'send',
                    pending: true,
                    label: 'Approve in your wallet',
                },
            ),
            frontendMilestone(
                5,
                'failed',
                'Approval failed',
                'A server-reported failed step displays its failure detail.',
                workflow([
                    [
                        'approve_permit2',
                        'failed',
                        'Token approval reverted. Try again.',
                    ],
                    ['sign', 'waiting'],
                    ['publish', 'waiting'],
                ]),
                { kind: 'send', swapError: true },
            ),
            frontendMilestone(
                10,
                'refresh-error',
                'Could not refresh actions',
                'An action refresh error marks only the current step and offers retry.',
                signatureRequired,
                { kind: 'send', swapError: true },
            ),
            frontendMilestone(
                15,
                'refresh',
                'Refreshing swap',
                'A retry removes the error and preserves completed approval.',
                signatureRequired,
                { kind: 'send', pending: true, label: 'Refreshing swap…' },
            ),
            frontendMilestone(
                25,
                'pending-error',
                'Published transaction pending',
                'A pending server step remains in progress even when a stale wallet error is present.',
                workflow([
                    ['approve_permit2', 'completed'],
                    ['sign', 'completed'],
                    ['publish', 'pending'],
                ]),
                { kind: 'send', swapError: true },
            ),
            frontendCompleted(),
        ],
    },
    {
        id: 'frontend-critical',
        label: 'Quote update and confirmation',
        group: 'token-swap',
        section: 'quotes-and-balances',
        milestones: [
            frontendMilestone(
                0,
                'ready',
                'Quote ready',
                'The full quote appears before swap creation.',
                undefined,
                { kind: 'send' },
                { swapId: undefined },
            ),
            frontendMilestone(
                5,
                'preparing',
                'Preparing swap',
                'Swap creation checks the new receiving amount before opening any wallet prompts.',
                undefined,
                { kind: 'send', pending: true, label: 'Preparing swap…' },
                { swapId: undefined },
            ),
            frontendMilestone(
                10,
                'critical',
                'Confirm receiving amount',
                'A changed receiving amount requires explicit confirmation before wallet execution.',
                approvalRequired,
                { kind: 'send', critical: 'confirmation' },
                {
                    quote: {
                        ...frontendQuote,
                        receive_amount: 0.032,
                        min_receive_amount: 0.03,
                    },
                },
            ),
            frontendMilestone(
                20,
                'continue',
                'Continue with approval',
                'Accepting the amount resumes the same workflow.',
                approvalRequired,
                {
                    kind: 'send',
                    pending: true,
                    label: 'Approve in your wallet',
                },
                {
                    quote: {
                        ...frontendQuote,
                        receive_amount: 0.032,
                        min_receive_amount: 0.03,
                    },
                },
            ),
        ],
    },
    {
        id: 'frontend-gasless',
        label: 'Gasless swap and standard fallback',
        group: 'token-swap',
        section: 'errors-and-retries',
        milestones: [
            frontendMilestone(
                0,
                'gasless',
                'Gasless quote ready',
                'An EIP-3009 token supports a sign-only flow; the initial quote is ready to start the swap.',
                undefined,
                { kind: 'send' },
                { ...gaslessFrontendState, swapId: undefined },
            ),
            frontendMilestone(
                5,
                'signing',
                'Sign in wallet',
                'A single signature uses the submitting button without a multi-step panel.',
                gaslessFrontendActions,
                { kind: 'send', pending: true, label: 'Sign in your wallet' },
                gaslessFrontendState,
            ),
            frontendMilestone(
                10,
                'unavailable',
                'Gasless unavailable',
                'Authorization submission failed; retry and standard transfer are available before funds move.',
                gaslessFrontendActions,
                {
                    kind: 'send',
                    gaslessUnavailable: true,
                    gaslessFailureStage: 'deposit',
                    gaslessMessage:
                        'The gasless deposit could not be completed.',
                },
                gaslessFrontendState,
            ),
            frontendMilestone(
                20,
                'standard',
                'Sign standard swap in wallet',
                'Switching to standard transfer starts a fresh self-paid workflow and opens the signature prompt automatically.',
                signatureRequired.slice(1).map((action) => ({
                    ...action,
                    token: gaslessFrontendToken,
                })),
                { kind: 'send', pending: true, label: 'Sign in your wallet' },
                {
                    ...gaslessFrontendState,
                    quoteState: {
                        status: 'ready',
                        expanded: false,
                        gasless: false,
                    },
                },
            ),
            frontendMilestone(
                30,
                'publish',
                'Publish standard swap',
                'After signing, the user pays gas for publication.',
                publishRequired.slice(1).map((action) => ({
                    ...action,
                    token: gaslessFrontendToken,
                })),
                {
                    kind: 'send',
                    pending: true,
                    label: 'Confirm in your wallet',
                },
                {
                    ...gaslessFrontendState,
                    quoteState: {
                        status: 'ready',
                        expanded: false,
                        gasless: false,
                    },
                },
            ),
            frontendCompleted(40),
        ],
    },
];

export const scenarios: readonly TimelineScenario[] = [
    standard,
    ...frontendScenarios,
    ...failures,
    {
        id: 'refuel',
        label: 'Transfer with refuel',
        group: 'wallet-transfer',
        section: 'main-flow',
        milestones: [
            m(
                0,
                'ready',
                'Refuel requested',
                'The quote includes destination gas.',
                snapshot({ refuel }),
            ),
            m(
                20,
                'input',
                'Refuel upcoming',
                'The deposit is confirming; refuel will follow output.',
                processing(
                    {
                        transactions: [
                            transaction(TransactionType.Input, {
                                confirmations: 3,
                            }),
                        ],
                    },
                    { refuel },
                ),
                SwapPhase.InputPending,
            ),
            m(
                90,
                'pending',
                'Refuel pending',
                'Output is ready; completion waits for the refuel transaction.',
                processing(
                    {
                        status: SwapStatus.Completed,
                        transactions: [input, output],
                    },
                    { refuel },
                ),
                SwapPhase.SettlingOutput,
            ),
            m(
                105,
                'complete',
                'Refuel complete',
                'Both output and destination gas are available.',
                processing(
                    {
                        status: SwapStatus.Completed,
                        transactions: [
                            input,
                            output,
                            transaction(TransactionType.Refuel, {
                                amount: refuel.amount,
                                timestamp: date(105),
                            }),
                        ],
                    },
                    { refuel },
                ),
                SwapPhase.Completed,
            ),
        ],
    },
    ...manualScenarios,
    ...[true, false].map(
        (isBelowMin): TimelineScenario => ({
            id: isBelowMin ? 'minimum-update' : 'maximum-update',
            label: isBelowMin
                ? 'Minimum amount adjusted'
                : 'Maximum amount adjusted',
            group: 'manual-deposit',
            section: 'quotes-and-balances',
            milestones: [
                m(
                    0,
                    'ready',
                    'Deposit instructions ready',
                    'The user can choose an exchange withdrawal network.',
                    manual(true),
                ),
                m(
                    5,
                    'limits',
                    'Transfer limits changed',
                    'Switching the withdrawal network requires confirmation of its amount limits.',
                    manual(true, {
                        manual: { ...manual(true).manual!, loading: true },
                        quoteUpdate: {
                            isBelowMin,
                            minAllowedAmount: isBelowMin ? 200 : 5,
                            maxAllowedAmount: isBelowMin ? 10000 : 50,
                        },
                    }),
                ),
                m(
                    15,
                    'adjusted',
                    'Amount adjusted',
                    'The user accepted the new transfer limit.',
                    manual(true, {
                        swap: {
                            ...manual(true).swap,
                            requested_amount: isBelowMin ? '200' : '50',
                        },
                        quote: {
                            ...quote,
                            requested_amount: isBelowMin ? 200 : 50,
                            receive_amount: isBelowMin ? 199 : 49,
                            min_receive_amount: isBelowMin ? 198 : 48.75,
                        },
                    }),
                ),
            ],
        }),
    ),
    ...walletScenarios,
    ...quoteScenarios,
    ...gaslessScenarios,
    ...specializedScenarios,
    ...supporting,
];

// Navigation order is explicit; fixture declaration order only orders cases within a section.
export const scenarioGroups = timelineGroups.map((group) => {
    const sections = timelineSections
        .map((section) => ({
            ...section,
            scenarios: scenarios.filter(
                (scenario) =>
                    scenario.group === group.id &&
                    scenario.section === section.id,
            ),
        }))
        .filter((section) => section.scenarios.length > 0);
    return {
        ...group,
        sections,
        scenarios: sections.flatMap((section) => section.scenarios),
    };
});
