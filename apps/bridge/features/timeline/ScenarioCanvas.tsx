import { memo, useEffect, useState, type Ref } from 'react';
import {
    Page2Preview,
    SecondaryButton,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    type Page2PreviewMode,
} from '@layerswap/widget/internal';
import { EPOCH } from './fixtures';
import {
    formatTime,
    type TimelineMilestone,
    type TimelineScenario,
} from './model';
import { MIN_SCALE, MAX_SCALE } from './canvasViewport';
import { useCanvasViewport } from './useCanvasViewport';

export function ScenarioCanvas({
    scenario,
    mode,
    pagesPerRow,
    onPagesPerRowChange,
}: {
    scenario: TimelineScenario;
    mode: Page2PreviewMode;
    pagesPerRow: number;
    onPagesPerRowChange: (count: number) => void;
}) {
    const columns = Math.min(pagesPerRow, scenario.milestones.length);
    const {
        viewportRef,
        contentRef,
        view,
        fit,
        zoom,
        focusFrame,
        panning,
        spacePressed,
        handlers,
    } = useCanvasViewport();
    useEffect(() => {
        fit();
    }, [columns, fit]);

    return (
        <div className="flex h-[calc(100dvh-96px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-secondary-400 bg-secondary-900 max-[700px]:h-[calc(100dvh-88px)]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-secondary-400 bg-secondary-800 px-4 py-3">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-secondary-text">
                        {scenario.milestones.length} frames
                    </span>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="canvas-pages-per-row"
                            className="whitespace-nowrap text-xs text-secondary-text"
                        >
                            Pages per row
                        </label>
                        <Select
                            value={String(columns)}
                            onValueChange={(value) =>
                                onPagesPerRowChange(Number(value))
                            }
                        >
                            <SelectTrigger
                                id="canvas-pages-per-row"
                                className="w-20"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                {scenario.milestones.map((_, index) => (
                                    <SelectItem
                                        key={index + 1}
                                        value={String(index + 1)}
                                    >
                                        {index + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div
                    role="group"
                    aria-label="Canvas zoom"
                    className="flex items-center gap-1"
                >
                    <SecondaryButton
                        aria-label="Zoom out"
                        disabled={view.scale <= MIN_SCALE}
                        onClick={() => zoom(view.scale / 1.2)}
                    >
                        −
                    </SecondaryButton>
                    <SecondaryButton
                        aria-label="Reset zoom to 100%"
                        onClick={() => zoom(1)}
                        className="min-w-16 tabular-nums"
                    >
                        {Math.round(view.scale * 100)}%
                    </SecondaryButton>
                    <SecondaryButton
                        aria-label="Zoom in"
                        disabled={view.scale >= MAX_SCALE}
                        onClick={() => zoom(view.scale * 1.2)}
                    >
                        +
                    </SecondaryButton>
                    <SecondaryButton onClick={fit} className="ml-2">
                        Fit all
                    </SecondaryButton>
                </div>
            </div>
            <div
                ref={viewportRef}
                role="region"
                aria-label="Scenario canvas"
                aria-describedby="canvas-instructions"
                tabIndex={0}
                {...handlers}
                onDoubleClickCapture={(event) => {
                    const target = event.target as Element;
                    if (target.closest('button, a, input, select, textarea'))
                        return;
                    const frame = target.closest<HTMLLIElement>(
                        'li[data-milestone-id]',
                    );
                    if (frame) focusFrame(frame);
                }}
                className={`relative min-h-0 w-full flex-1 overflow-hidden select-none ${panning ? 'cursor-grabbing' : 'cursor-grab'} ${spacePressed ? '[&_*]:cursor-grab!' : ''}`}
                style={{
                    touchAction: 'none',
                    backgroundImage:
                        'radial-gradient(circle, var(--color-secondary-300) 1px, transparent 1px)',
                    backgroundSize: `${Math.max(16, 24 * view.scale)}px ${Math.max(16, 24 * view.scale)}px`,
                    backgroundPosition: `${view.x}px ${view.y}px`,
                }}
            >
                <div
                    data-canvas-transform
                    className="absolute top-0 left-0 origin-top-left will-change-transform"
                    style={{
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    }}
                >
                    <CanvasFrames
                        scenario={scenario}
                        mode={mode}
                        columns={columns}
                        contentRef={contentRef}
                        onFocusFrame={focusFrame}
                    />
                </div>
            </div>
            <p
                id="canvas-instructions"
                className="shrink-0 border-t border-secondary-400 bg-secondary-800 px-4 py-3 text-xs leading-relaxed text-secondary-text"
            >
                Drag the canvas or hold Space to pan. Scroll to move; Ctrl/⌘ +
                scroll to zoom. Double-click a frame to focus. Use arrows to
                pan, +/− to zoom, or F to fit.
            </p>
        </div>
    );
}

// Keep the shared previews out of pan/zoom renders; only the workspace transform changes.
const CanvasFrames = memo(function CanvasFrames({
    scenario,
    mode,
    columns,
    contentRef,
    onFocusFrame,
}: {
    scenario: TimelineScenario;
    mode: Page2PreviewMode;
    columns: number;
    contentRef: Ref<HTMLOListElement>;
    onFocusFrame: (frame: HTMLLIElement) => void;
}) {
    return (
        <ol
            ref={contentRef}
            className="relative grid items-start gap-16"
            style={{
                width: columns * 472 + (columns - 1) * 64,
                gridTemplateColumns: `repeat(${columns}, 472px)`,
            }}
        >
            {scenario.milestones.map((milestone, index) => (
                <li
                    key={milestone.id}
                    data-milestone-id={milestone.id}
                    className="cursor-default"
                >
                    <header className="min-h-[100px] pt-3 pb-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-secondary-text">
                            <span>
                                Step {index + 1} · {formatTime(milestone.at)}
                            </span>
                            <SecondaryButton
                                aria-label={`Focus step ${index + 1}: ${milestone.label}`}
                                onClick={(event) => {
                                    const frame =
                                        event.currentTarget.closest('li');
                                    if (frame) onFocusFrame(frame);
                                }}
                            >
                                Focus
                            </SecondaryButton>
                        </div>
                        <h3 className="text-base font-medium">
                            {milestone.label}
                        </h3>
                    </header>
                    <MilestonePreview milestone={milestone} mode={mode} />
                    <p className="mt-4 text-sm leading-relaxed text-secondary-text">
                        {milestone.description}
                    </p>
                </li>
            ))}
        </ol>
    );
});

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
