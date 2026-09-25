import Head from 'next/head';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import {
    Page2Preview,
    SecondaryButton,
    Select,
    SelectContent,
    SelectGroup,
    SelectLabel,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    type Page2PreviewMode,
} from '@layerswap/widget/internal';
import { EPOCH, scenarios, scenarioGroups } from './fixtures';
import { formatTime, selectScenario, selectTime } from './model';
import { ScenarioCanvas } from './ScenarioCanvas';

type PreviewLayout = 'timeline' | 'canvas';

export default function TimelinePage() {
    const [layout, setLayout] = useState<PreviewLayout>('canvas');
    const [panelOpen, setPanelOpen] = useState(true);
    const [pagesPerRow, setPagesPerRow] = useState(3);
    const [mode, setMode] = useState<Page2PreviewMode>('component');
    const [selection, setSelection] = useState(() =>
        selectScenario(scenarioGroups[0].scenarios[0]),
    );
    const scenario = scenarios.find(
        (item) => item.id === selection.scenarioId,
    )!;
    const group = scenarioGroups.find((item) => item.id === scenario.group)!;
    const { time, milestone, previous, next, first, last } = selectTime(
        scenario,
        selection.seconds,
    );
    const setTime = (seconds: number) =>
        setSelection((current) => ({
            scenarioId: current.scenarioId,
            seconds,
        }));
    const snapshot = milestone.snapshot;
    const previewSnapshot =
        snapshot.kind === 'swap' && selection.quoteExpanded !== undefined
            ? {
                  ...snapshot,
                  quoteState: {
                      ...snapshot.quoteState,
                      expanded: selection.quoteExpanded,
                  },
              }
            : snapshot;

    const flowSelector = (
        <div className="min-w-0">
            <label
                htmlFor="timeline-group"
                className="mb-2 block text-xs text-secondary-text"
            >
                Transfer flow
            </label>
            <Select
                value={group.id}
                onValueChange={(id) => {
                    const nextGroup = scenarioGroups.find(
                        (item) => item.id === id,
                    );
                    if (nextGroup)
                        setSelection(selectScenario(nextGroup.scenarios[0]));
                }}
            >
                <SelectTrigger
                    id="timeline-group"
                    aria-describedby={
                        layout === 'timeline'
                            ? 'timeline-group-description'
                            : undefined
                    }
                    className="focus-visible:rounded-md!"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent
                    position="popper"
                    className="motion-reduce:animate-none!"
                >
                    {scenarioGroups.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const scenarioSelector = (
        <div className="min-w-0">
            <label
                htmlFor="timeline-scenario"
                className="mb-2 block text-xs text-secondary-text"
            >
                Scenario
            </label>
            <Select
                value={scenario.id}
                onValueChange={(id) => {
                    const nextScenario = group.scenarios.find(
                        (item) => item.id === id,
                    );
                    if (nextScenario)
                        setSelection(selectScenario(nextScenario));
                }}
            >
                <SelectTrigger
                    id="timeline-scenario"
                    className="text-left [&>span]:truncate"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent
                    position="popper"
                    className="max-h-[min(480px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-y-auto styled-scroll"
                >
                    {group.sections.map((section) => (
                        <SelectGroup key={section.id}>
                            <SelectLabel>{section.label}</SelectLabel>
                            {section.scenarios.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const pageHeading = (
        <header>
            <p className="text-[11px] font-medium tracking-[0.13em] text-secondary-text">
                LAYERSWAP · PAGE 2
            </p>
            <h1 className="mt-3 text-2xl font-medium tracking-tight">
                Transfer timeline
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-secondary-text">
                Explore each state with sample data.
            </p>
        </header>
    );

    const previewModeSelector = (
        <div>
            <p
                id="preview-mode-label"
                className="mb-2 text-xs text-secondary-text"
            >
                Preview mode
            </p>
            <TabsList
                aria-labelledby="preview-mode-label"
                className="w-full max-w-[472px] bg-secondary-500"
            >
                {(['component', 'modal'] as const).map((value) => (
                    <TabsTrigger
                        key={value}
                        value={value}
                        className="flex-1 data-[state=active]:bg-secondary-300 data-[state=active]:text-primary-text"
                    >
                        {value === 'component' ? 'Component' : 'Modal'}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );

    return (
        <>
            <Head>
                <title>Page 2 timeline | Layerswap</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="min-h-screen bg-linear-to-b from-secondary-900 to-secondary-500">
                <main
                    className={`${layout === 'timeline' ? 'max-w-[1080px] px-7 pt-9 pb-12 max-[700px]:pt-6 max-[700px]:pb-8' : `max-w-none px-7 pt-20 pb-4 max-[700px]:pt-[72px] ${panelOpen ? 'min-[701px]:pl-[344px]' : ''}`} mx-auto font-sans text-primary-text max-[700px]:px-4 [&_:focus-visible]:outline-2! [&_:focus-visible]:outline-solid! [&_:focus-visible]:outline-primary-text! [&_:focus-visible]:outline-offset-3! [&_:focus-visible]:shadow-none! motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto! motion-reduce:[&_*::before]:animate-none! motion-reduce:[&_*::before]:transition-none! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:transition-none!`}
                >
                    <Tabs
                        value={mode}
                        onValueChange={(value) =>
                            setMode(value as Page2PreviewMode)
                        }
                    >
                        {layout === 'timeline' && (
                            <div className="mb-8 pr-44 max-[700px]:mb-6 max-[700px]:pt-14 max-[700px]:pr-0">
                                {pageHeading}
                            </div>
                        )}
                        <div
                            role="group"
                            aria-label="Preview layout"
                            className="fixed top-6 right-7 z-40 flex gap-2 rounded-xl border border-secondary-400 bg-secondary-900/95 p-1.5 shadow-lg max-[700px]:top-4 max-[700px]:right-4"
                        >
                            {(
                                [
                                    ['timeline', 'Timeline'],
                                    ['canvas', 'Canvas'],
                                ] as const
                            ).map(([value, label]) => (
                                <SecondaryButton
                                    key={value}
                                    aria-pressed={layout === value}
                                    onClick={() => setLayout(value)}
                                    className="aria-pressed:border-primary aria-pressed:bg-secondary-400"
                                >
                                    {label}
                                </SecondaryButton>
                            ))}
                        </div>
                        {layout === 'canvas' && (
                            <>
                                <div
                                    className={`fixed top-6 z-40 max-[700px]:top-4 max-[700px]:left-4 ${panelOpen ? 'left-[260px]' : 'left-7'}`}
                                >
                                    <SecondaryButton
                                        aria-label={
                                            panelOpen
                                                ? 'Hide canvas controls'
                                                : 'Show canvas controls'
                                        }
                                        aria-expanded={panelOpen}
                                        aria-controls="canvas-controls"
                                        onClick={() =>
                                            setPanelOpen((open) => !open)
                                        }
                                        className="h-10 shadow-lg"
                                    >
                                        <span className="flex items-center gap-2">
                                            {panelOpen ? (
                                                <PanelLeftClose
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <PanelLeftOpen
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            {!panelOpen && 'Controls'}
                                        </span>
                                    </SecondaryButton>
                                </div>
                                <aside
                                    id="canvas-controls"
                                    aria-label="Canvas controls"
                                    hidden={!panelOpen}
                                    className={`${panelOpen ? '' : 'hidden'} fixed inset-y-0 left-0 z-30 w-80 overflow-y-auto border-r border-secondary-400 bg-secondary-800 px-5 pt-9 pb-6 max-[700px]:top-20 max-[700px]:bottom-4 max-[700px]:left-4 max-[700px]:w-[min(320px,calc(100%-32px))] max-[700px]:rounded-xl max-[700px]:border max-[700px]:shadow-xl styled-scroll`}
                                >
                                    {pageHeading}
                                    <div className="mt-7 space-y-5 border-t border-secondary-400 pt-6">
                                        {flowSelector}
                                        {scenarioSelector}
                                        {previewModeSelector}
                                    </div>
                                </aside>
                            </>
                        )}
                        <div
                            className={
                                layout === 'timeline'
                                    ? 'grid grid-cols-[minmax(230px,320px)_minmax(0,1fr)] items-start gap-10 max-[700px]:grid-cols-1 max-[700px]:gap-6'
                                    : 'w-full'
                            }
                        >
                            {layout === 'timeline' && (
                                <aside
                                    className="overflow-hidden rounded-2xl border border-secondary-400 bg-secondary-800"
                                    aria-label="Scenarios"
                                >
                                    <div className="border-b border-secondary-400 p-4">
                                        {flowSelector}
                                        <p
                                            id="timeline-group-description"
                                            className="mt-3 text-xs leading-relaxed text-secondary-text"
                                        >
                                            {group.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between px-4 pt-4 pb-1">
                                        <h2 className="text-sm font-medium">
                                            Scenarios
                                        </h2>
                                        <span className="rounded-md bg-secondary-400 px-2 py-0.5 text-xs text-secondary-text">
                                            {group.scenarios.length}
                                        </span>
                                    </div>
                                    <div
                                        id="timeline-scenarios"
                                        key={group.id}
                                        className="max-h-[610px] space-y-4 overflow-y-auto p-2 max-[700px]:max-h-[210px] styled-scroll"
                                    >
                                        {group.sections.map((section) => (
                                            <section
                                                key={section.id}
                                                aria-label={section.label}
                                                className="space-y-1"
                                            >
                                                <h3 className="px-2 pt-2 pb-1 text-xs font-medium text-secondary-text">
                                                    {section.label}
                                                </h3>
                                                {section.scenarios.map(
                                                    (item) => (
                                                        <SecondaryButton
                                                            size="lg"
                                                            key={item.id}
                                                            aria-label={
                                                                item.label
                                                            }
                                                            aria-pressed={
                                                                scenario.id ===
                                                                item.id
                                                            }
                                                            onClick={() =>
                                                                setSelection(
                                                                    selectScenario(
                                                                        item,
                                                                    ),
                                                                )
                                                            }
                                                            className="w-full text-left aria-pressed:border-primary aria-pressed:bg-secondary-400 focus-visible:rounded-md! [&>span]:w-full"
                                                        >
                                                            <span className="flex items-center justify-between gap-2">
                                                                <span>
                                                                    {item.label}
                                                                </span>
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="shrink-0 text-xs font-normal text-secondary-text"
                                                                >
                                                                    {
                                                                        item
                                                                            .milestones
                                                                            .length
                                                                    }{' '}
                                                                    steps
                                                                </span>
                                                            </span>
                                                        </SecondaryButton>
                                                    ),
                                                )}
                                            </section>
                                        ))}
                                    </div>
                                </aside>
                            )}
                            <section
                                className="flex min-w-0 flex-col items-center"
                                aria-labelledby="scenario-title"
                            >
                                <div
                                    className={
                                        layout === 'timeline'
                                            ? 'mb-4 w-full max-w-[472px]'
                                            : 'sr-only'
                                    }
                                >
                                    <p className="mb-1 text-xs text-secondary-text">
                                        {group.label}
                                    </p>
                                    <h2
                                        id="scenario-title"
                                        className="text-lg font-medium"
                                    >
                                        {scenario.label}
                                    </h2>
                                </div>
                                {layout === 'timeline' && (
                                    <div className="w-full max-w-[472px]">
                                        {previewModeSelector}
                                    </div>
                                )}
                                <TabsContent
                                    value={mode}
                                    className={`layerswap-styles w-full ${layout === 'timeline' ? 'mt-4 max-w-[472px]' : 'mt-0!'}`}
                                >
                                    {layout === 'canvas' ? (
                                        <ScenarioCanvas
                                            key={scenario.id}
                                            scenario={scenario}
                                            mode={mode}
                                            pagesPerRow={pagesPerRow}
                                            onPagesPerRowChange={setPagesPerRow}
                                        />
                                    ) : (
                                        <Page2Preview
                                            snapshot={previewSnapshot}
                                            now={EPOCH + time * 1000}
                                            mode={mode}
                                            onQuoteExpandedChange={(
                                                quoteExpanded,
                                            ) =>
                                                setSelection((current) => ({
                                                    ...current,
                                                    quoteExpanded,
                                                }))
                                            }
                                        />
                                    )}
                                </TabsContent>
                            </section>
                        </div>
                        {layout === 'timeline' && (
                            <section
                                className="mt-7 rounded-2xl border border-secondary-400 bg-secondary-800 p-6 max-[700px]:p-4"
                                aria-label="Timeline controls"
                            >
                                <div className="mb-6 flex items-center justify-between gap-3 max-[700px]:flex-wrap">
                                    <div>
                                        <p className="text-[11px] font-medium tracking-[0.13em] text-secondary-text">
                                            SIMULATED TIME
                                        </p>
                                        <output
                                            htmlFor="timeline-time"
                                            className="mt-1 block text-[28px] tracking-[-0.03em] tabular-nums max-[700px]:text-2xl"
                                        >
                                            {formatTime(time)}
                                        </output>
                                    </div>
                                    <div className="flex gap-2 max-[700px]:ml-auto">
                                        <SecondaryButton
                                            size="lg"
                                            disabled={!previous}
                                            className="whitespace-nowrap focus-visible:rounded-md!"
                                            onClick={() =>
                                                previous && setTime(previous.at)
                                            }
                                        >
                                            ← Previous
                                        </SecondaryButton>
                                        <SecondaryButton
                                            size="lg"
                                            disabled={!next}
                                            className="whitespace-nowrap focus-visible:rounded-md!"
                                            onClick={() =>
                                                next && setTime(next.at)
                                            }
                                        >
                                            Next →
                                        </SecondaryButton>
                                    </div>
                                </div>
                                <label
                                    htmlFor="timeline-time"
                                    className="flex justify-between gap-2 text-xs text-secondary-text max-[700px]:text-[11px]"
                                >
                                    <span>Elapsed simulated time</span>
                                    <span>1 second per step</span>
                                </label>
                                <input
                                    id="timeline-time"
                                    className="my-1.5 block h-[30px] w-full cursor-pointer accent-primary"
                                    type="range"
                                    min={first.at}
                                    max={last.at}
                                    step={1}
                                    value={time}
                                    aria-valuetext={`${formatTime(time)} — ${milestone.label}`}
                                    onChange={(event) =>
                                        setTime(Number(event.target.value))
                                    }
                                />
                                <div className="flex justify-between text-[11px] text-secondary-text tabular-nums">
                                    <span>{formatTime(first.at)}</span>
                                    <span>{formatTime(last.at)}</span>
                                </div>
                                <ol
                                    className="my-5 flex list-none flex-wrap gap-2 p-0"
                                    aria-label="Milestones"
                                >
                                    {scenario.milestones.map((item) => (
                                        <li key={item.id}>
                                            <SecondaryButton
                                                aria-current={
                                                    milestone.id === item.id
                                                        ? 'step'
                                                        : undefined
                                                }
                                                onClick={() => setTime(item.at)}
                                                className="h-full text-left aria-[current=step]:border-primary aria-[current=step]:bg-secondary-400 focus-visible:rounded-md!"
                                            >
                                                <span className="mb-1 block text-[10px] text-secondary-text tabular-nums">
                                                    {formatTime(item.at)}
                                                </span>
                                                {item.label}
                                            </SecondaryButton>
                                        </li>
                                    ))}
                                </ol>
                                <div
                                    className="min-h-[65px] border-t border-secondary-400 pt-4 text-sm"
                                    role="status"
                                    aria-live="polite"
                                    aria-atomic="true"
                                >
                                    <strong className="font-medium">
                                        {milestone.label}
                                    </strong>
                                    <p className="mt-1 text-sm leading-relaxed text-secondary-text">
                                        {milestone.description}
                                    </p>
                                </div>
                            </section>
                        )}
                    </Tabs>
                </main>
            </div>
        </>
    );
}

TimelinePage.getLayout = (page: ReactElement) => page;
