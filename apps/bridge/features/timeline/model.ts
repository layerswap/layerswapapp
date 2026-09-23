import type { Page2Snapshot, SwapPhase } from '@layerswap/widget/internal';

export const timelineGroups = [
    {
        id: 'wallet-transfer',
        label: 'Wallet transfers',
        description: 'Send funds across networks from a connected wallet.',
    },
    {
        id: 'token-swap',
        label: 'Token swaps',
        description:
            'Swap tokens on the same network, with approval, signing and publication.',
    },
    {
        id: 'gasless',
        label: 'Gasless transfers',
        description:
            'Authorize a transfer with the source network fee covered.',
    },
    {
        id: 'manual-deposit',
        label: 'Manual deposits',
        description: 'Send to a deposit address from a network or exchange.',
    },
    {
        id: 'hyperliquid',
        label: 'Hyperliquid withdrawals',
        description: 'Withdraw from a Hyperliquid balance.',
    },
    {
        id: 'polymarket',
        label: 'Polymarket withdrawals',
        description: 'Withdraw from a Polymarket account.',
    },
    {
        id: 'page-states',
        label: 'Page states',
        description:
            'Loading and unavailable swaps, before a transfer flow is shown.',
    },
] as const;

export const timelineSections = [
    { id: 'main-flow', label: 'Main flow' },
    { id: 'wallet-setup', label: 'Wallet setup' },
    { id: 'quotes-and-balances', label: 'Quotes and balances' },
    { id: 'errors-and-retries', label: 'Errors and retries' },
    { id: 'outcomes', label: 'Transfer outcomes' },
] as const;

export type TimelineMilestone = {
    id: string;
    at: number;
    label: string;
    description: string;
    snapshot: Page2Snapshot;
    expectedPhase?: SwapPhase;
};
export type TimelineScenario = {
    id: string;
    label: string;
    group: (typeof timelineGroups)[number]['id'];
    section: (typeof timelineSections)[number]['id'];
    milestones: readonly [TimelineMilestone, ...TimelineMilestone[]];
};
export type TimelineSelection = {
    scenarioId: string;
    seconds: number;
    quoteExpanded?: boolean;
};

export function selectScenario(scenario: TimelineScenario): TimelineSelection {
    return { scenarioId: scenario.id, seconds: scenario.milestones[0].at };
}

export function selectTime(scenario: TimelineScenario, seconds: number) {
    const first = scenario.milestones[0];
    const last = scenario.milestones[scenario.milestones.length - 1];
    const time = Math.min(
        last.at,
        Math.max(
            first.at,
            Number.isFinite(seconds) ? Math.floor(seconds) : first.at,
        ),
    );
    const milestone = [...scenario.milestones]
        .reverse()
        .find((item) => item.at <= time)!;
    const previous = [...scenario.milestones]
        .reverse()
        .find((item) => item.at < time);
    const next = scenario.milestones.find((item) => item.at > time);
    return { time, milestone, previous, next, first, last };
}

export function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return [hours, minutes, seconds % 60]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
}
