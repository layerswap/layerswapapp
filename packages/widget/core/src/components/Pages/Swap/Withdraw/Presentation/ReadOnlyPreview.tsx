import { MotionConfig } from 'framer-motion';
import type { ReactNode, SyntheticEvent } from 'react';
import type { Page2PreviewMode } from './Page2PreviewFrame';
const preventInteraction = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
};
/** Preview-only safety and labelling; no Page 2 presentation belongs here. */
export function ReadOnlyPreview({
    children,
    mode,
    allowQuoteDisclosure,
}: {
    children: ReactNode;
    mode: Page2PreviewMode;
    allowQuoteDisclosure?: boolean;
}) {
    const preventAction = (event: SyntheticEvent) => {
        if (
            allowQuoteDisclosure &&
            event.target instanceof Element &&
            event.target.closest('button[data-page2-quote-disclosure]')
        )
            return;
        preventInteraction(event);
    };

    return (
        <MotionConfig reducedMotion="user">
            <section
                aria-label="Read-only preview"
                data-page2-preview
                data-preview-mode={mode}
                className="w-full max-w-[472px] text-primary-text font-robo"
            >
                <div className="mb-3 text-sm text-secondary-text">
                    Read-only preview
                </div>
                <div
                    className="w-full"
                    onClickCapture={preventAction}
                    onAuxClickCapture={preventInteraction}
                    onKeyDownCapture={(event) => {
                        if (event.key === 'Enter' || event.key === ' ')
                            preventAction(event);
                    }}
                >
                    {children}
                </div>
            </section>
        </MotionConfig>
    );
}
