
export type ProgressStates = {
    [key in Progress]?: {
        [key in ProgressStatus]?: {
            name?: string;
            description?: JSX.Element | string | null | undefined
        }
    }
}
export enum Progress {
    InputTransfer = 'input_transfer',
    Refuel = 'refuel',
    OutputTransfer = 'output_transfer'
}
export enum ProgressStatus {
    Upcoming = 'upcoming',
    Current = 'current',
    Complete = 'complete',
    Failed = 'failed',
    Delayed = 'delayed',
    Removed = 'removed',
}
export type StatusStep = {
    name?: string;
    status: ProgressStatus;
    description?: | JSX.Element | string | null;
    index?: number;
}