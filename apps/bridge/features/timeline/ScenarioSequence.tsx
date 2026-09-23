import { useState } from 'react';
import {
    Page2Preview,
    type Page2PreviewMode,
} from '@layerswap/widget/internal';
import { EPOCH } from './fixtures';
import {
    formatTime,
    type TimelineMilestone,
    type TimelineScenario,
} from './model';

export function ScenarioSequence({
    scenario,
    mode,
}: {
    scenario: TimelineScenario;
    mode: Page2PreviewMode;
}) {
    return (
        <>
            <p className="mb-4 text-sm text-secondary-text">
                {scenario.milestones.length} steps in order. Scroll sideways to
                compare.
            </p>
            <div
                role="region"
                aria-label="Scenario steps"
                tabIndex={0}
                className="w-full overflow-x-auto pb-4 styled-scroll"
            >
                <ol className="grid grid-flow-col auto-cols-[min(472px,100%)] items-start gap-6">
                    {scenario.milestones.map((milestone, index) => (
                        <li key={milestone.id} data-milestone-id={milestone.id}>
                            <header className="min-h-[100px] border-t border-secondary-400 pt-3 pb-4">
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-secondary-text">
                                    <span>Step {index + 1}</span>
                                    <span className="tabular-nums">
                                        {formatTime(milestone.at)}
                                    </span>
                                </div>
                                <h3 className="text-base font-medium">
                                    {milestone.label}
                                </h3>
                            </header>
                            <MilestonePreview
                                milestone={milestone}
                                mode={mode}
                            />
                            <p className="mt-4 text-sm leading-relaxed text-secondary-text">
                                {milestone.description}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </>
    );
}

function MilestonePreview({
    milestone,
    mode,
}: {
    milestone: TimelineMilestone;
    mode: Page2PreviewMode;
}) {
    const [quoteExpanded, setQuoteExpanded] = useState<boolean>();
    const snapshot = milestone.snapshot;
    const previewSnapshot =
        snapshot.kind === 'swap' && quoteExpanded !== undefined
            ? {
                  ...snapshot,
                  quoteState: {
                      ...snapshot.quoteState,
                      expanded: quoteExpanded,
                  },
              }
            : snapshot;

    return (
        <Page2Preview
            snapshot={previewSnapshot}
            now={EPOCH + milestone.at * 1000}
            mode={mode}
            onQuoteExpandedChange={setQuoteExpanded}
        />
    );
}
