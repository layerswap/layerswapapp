import Head from 'next/head';
import { useState, type ReactElement } from 'react';
import {
    Page2Preview,
    SecondaryButton,
    Select,
    SelectContent,
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
import { ScenarioSequence } from './ScenarioSequence';

type PreviewLayout = 'timeline' | 'sequence';

export default function TimelinePage() {
    const [layout, setLayout] = useState<PreviewLayout>('timeline');
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

    return (
        <>
            <Head>
                <title>Page 2 timeline | Layerswap</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="min-h-screen bg-linear-to-b from-secondary-900 to-secondary-500">
                <main
                    className={`${layout === 'timeline' ? 'max-w-[1080px]' : 'max-w-none'} mx-auto px-7 pt-9 pb-12 font-sans text-primary-text max-[700px]:px-4 max-[700px]:pt-6 max-[700px]:pb-8 [&_:focus-visible]:outline-2! [&_:focus-visible]:outline-solid! [&_:focus-visible]:outline-primary-text! [&_:focus-visible]:outline-offset-3! [&_:focus-visible]:shadow-none! motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto! motion-reduce:[&_*::before]:animate-none! motion-reduce:[&_*::before]:transition-none! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:transition-none!`}
                >
                    <header className="mb-8 flex items-end justify-between gap-6 max-[700px]:mb-6 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-2.5">
                        <div>
                            <p className="text-[11px] font-medium tracking-[0.13em] text-secondary-text">
                                LAYERSWAP · PAGE 2
                            </p>
                            <h1 className="mt-2 text-3xl font-medium tracking-tight max-[700px]:text-[26px]">
                                Transfer timeline
                            </h1>
                        </div>
                        <div>
                            <p className="mb-3 text-sm text-secondary-text">
                                Explore each state with sample data.
                            </p>
                            <div
                                role="group"
                                aria-label="Preview layout"
                                className="flex gap-2"
                            >
                                {(
                                    [
                                        ['timeline', 'Timeline'],
                                        ['sequence', 'Side by side'],
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
                        </div>
                    </header>
                    <div className="grid grid-cols-[minmax(230px,320px)_minmax(0,1fr)] items-start gap-10 max-[700px]:grid-cols-1 max-[700px]:gap-6">
                        <aside
                            className="overflow-hidden rounded-2xl border border-secondary-400 bg-secondary-800"
                            aria-label="Scenarios"
                        >
                            <div className="border-b border-secondary-400 p-4">
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
                                            setSelection(
                                                selectScenario(
                                                    nextGroup.scenarios[0],
                                                ),
                                            );
                                    }}
                                >
                                    <SelectTrigger
                                        id="timeline-group"
                                        aria-describedby="timeline-group-description"
                                        className="focus-visible:rounded-md!"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="motion-reduce:animate-none!"
                                    >
                                        {scenarioGroups.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                        {section.scenarios.map((item) => (
                                            <SecondaryButton
                                                size="lg"
                                                key={item.id}
                                                aria-label={item.label}
                                                aria-pressed={
                                                    scenario.id === item.id
                                                }
                                                onClick={() =>
                                                    setSelection(
                                                        selectScenario(item),
                                                    )
                                                }
                                                className="w-full text-left aria-pressed:border-primary aria-pressed:bg-secondary-400 focus-visible:rounded-md! [&>span]:w-full"
                                            >
                                                <span className="flex items-center justify-between gap-2">
                                                    <span>{item.label}</span>
                                                    <span
                                                        aria-hidden="true"
                                                        className="shrink-0 text-xs font-normal text-secondary-text"
                                                    >
                                                        {item.milestones.length}{' '}
                                                        steps
                                                    </span>
                                                </span>
                                            </SecondaryButton>
                                        ))}
                                    </section>
                                ))}
                            </div>
                        </aside>
                        <section
                            className="flex min-w-0 flex-col items-center"
                            aria-labelledby="scenario-title"
                        >
                            <div
                                className={`mb-4 w-full ${layout === 'timeline' ? 'max-w-[472px]' : ''}`}
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
                            <Tabs
                                value={mode}
                                onValueChange={(value) =>
                                    setMode(value as Page2PreviewMode)
                                }
                                className={`w-full ${layout === 'timeline' ? 'max-w-[472px]' : ''}`}
                            >
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
                                    {(['component', 'modal'] as const).map(
                                        (value) => (
                                            <TabsTrigger
                                                key={value}
                                                value={value}
                                                className="flex-1 data-[state=active]:bg-secondary-300 data-[state=active]:text-primary-text"
                                            >
                                                {value === 'component'
                                                    ? 'Component'
                                                    : 'Modal'}
                                            </TabsTrigger>
                                        ),
                                    )}
                                </TabsList>
                                <TabsContent
                                    value={mode}
                                    className="layerswap-styles mt-4"
                                >
                                    {layout === 'sequence' ? (
                                        <ScenarioSequence
                                            key={scenario.id}
                                            scenario={scenario}
                                            mode={mode}
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
                            </Tabs>
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
                                        onClick={() => next && setTime(next.at)}
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
                </main>
            </div>
        </>
    );
}

TimelinePage.getLayout = (page: ReactElement) => page;
