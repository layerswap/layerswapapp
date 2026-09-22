import type { Page2Snapshot, SwapPhase } from '@layerswap/widget/internal';

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
    group: string;
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
