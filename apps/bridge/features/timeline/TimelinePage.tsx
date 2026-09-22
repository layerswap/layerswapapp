import Head from 'next/head';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import {
    Page2Preview,
    type Page2PreviewMode,
} from '@layerswap/widget/internal';
import { EPOCH, scenarios } from './fixtures';
import { formatTime, selectScenario, selectTime } from './model';
import styles from './timeline.module.css';

const groups = [...new Set(scenarios.map((scenario) => scenario.group))].map(
    (name) => ({
        name,
        scenarios: scenarios.filter((scenario) => scenario.group === name),
    }),
);

export default function TimelinePage() {
    const [mode, setMode] = useState<Page2PreviewMode>('component');
    const [selection, setSelection] = useState(() =>
        selectScenario(scenarios[0]),
    );
    const scenario = scenarios.find(
        (item) => item.id === selection.scenarioId,
    )!;
    const group = groups.find((item) => item.name === scenario.group)!;
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
            <div className={styles.page}>
                <main
                    className={`${styles.timeline} layerswap-styles font-robo text-primary-text`}
                >
                    <header className={styles.header}>
                        <div>
                            <p className={styles.eyebrow}>LAYERSWAP · PAGE 2</p>
                            <h1>Transfer timeline</h1>
                        </div>
                        <p>
                            <span>Explore each state with sample data.</span>
                            <br />
                            <span>Time moves only when you move it.</span>
                        </p>
                    </header>
                    <div className={styles.workspace}>
                        <aside
                            className={styles.scenarios}
                            aria-label="Scenarios"
                        >
                            <div className={styles.groupPicker}>
                                <label htmlFor="timeline-group">
                                    Scenario group
                                </label>
                                <div className={styles.selectField}>
                                    <select
                                        id="timeline-group"
                                        value={group.name}
                                        aria-controls="timeline-scenarios"
                                        onChange={(event) => {
                                            const nextGroup = groups.find(
                                                (item) =>
                                                    item.name ===
                                                    event.target.value,
                                            );
                                            if (nextGroup)
                                                setSelection(
                                                    selectScenario(
                                                        nextGroup.scenarios[0],
                                                    ),
                                                );
                                        }}
                                    >
                                        {groups.map((item) => (
                                            <option
                                                key={item.name}
                                                value={item.name}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown aria-hidden="true" />
                                </div>
                            </div>
                            <div className={styles.listHeading}>
                                <h2>Scenarios</h2>
                                <span>{group.scenarios.length}</span>
                            </div>
                            <div
                                id="timeline-scenarios"
                                key={group.name}
                                className={styles.scenarioList}
                            >
                                {group.scenarios.map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        aria-pressed={scenario.id === item.id}
                                        onClick={() =>
                                            setSelection(selectScenario(item))
                                        }
                                        className={styles.scenarioButton}
                                    >
                                        <span>{item.label}</span>
                                        <span aria-hidden="true">
                                            {item.milestones.length} steps
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>
                        <section
                            className={styles.previewColumn}
                            aria-labelledby="scenario-title"
                        >
                            <div className={styles.selectionHeading}>
                                <p>{scenario.group}</p>
                                <h2 id="scenario-title">{scenario.label}</h2>
                            </div>
                            <fieldset className={styles.modes}>
                                <legend>Preview mode</legend>
                                {(['component', 'modal'] as const).map(
                                    (value) => (
                                        <label key={value}>
                                            <input
                                                type="radio"
                                                name="preview-mode"
                                                value={value}
                                                checked={mode === value}
                                                onChange={() => setMode(value)}
                                            />
                                            <span>
                                                {value === 'component'
                                                    ? 'Component'
                                                    : 'Modal'}
                                            </span>
                                        </label>
                                    ),
                                )}
                            </fieldset>
                            <Page2Preview
                                snapshot={previewSnapshot}
                                now={EPOCH + time * 1000}
                                mode={mode}
                                onQuoteExpandedChange={(quoteExpanded) =>
                                    setSelection((current) => ({
                                        ...current,
                                        quoteExpanded,
                                    }))
                                }
                            />
                        </section>
                    </div>
                    <section
                        className={styles.controls}
                        aria-label="Timeline controls"
                    >
                        <div className={styles.controlHeading}>
                            <div>
                                <p className={styles.eyebrow}>SIMULATED TIME</p>
                                <output
                                    htmlFor="timeline-time"
                                    className={styles.time}
                                >
                                    {formatTime(time)}
                                </output>
                            </div>
                            <div className={styles.navigation}>
                                <button
                                    type="button"
                                    disabled={!previous}
                                    onClick={() =>
                                        previous && setTime(previous.at)
                                    }
                                >
                                    ← Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={!next}
                                    onClick={() => next && setTime(next.at)}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                        <label
                            htmlFor="timeline-time"
                            className={styles.sliderLabel}
                        >
                            <span>Elapsed simulated time</span>
                            <span>1 second per step</span>
                        </label>
                        <input
                            id="timeline-time"
                            className={styles.slider}
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
                        <div className={styles.rangeLabels}>
                            <span>{formatTime(first.at)}</span>
                            <span>{formatTime(last.at)}</span>
                        </div>
                        <ol
                            className={styles.milestones}
                            aria-label="Milestones"
                        >
                            {scenario.milestones.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        aria-current={
                                            milestone.id === item.id
                                                ? 'step'
                                                : undefined
                                        }
                                        onClick={() => setTime(item.at)}
                                    >
                                        <span>{formatTime(item.at)}</span>
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ol>
                        <div
                            className={styles.announcement}
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <strong>{milestone.label}</strong>
                            <p>{milestone.description}</p>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}

TimelinePage.getLayout = (page: ReactElement) => page;
