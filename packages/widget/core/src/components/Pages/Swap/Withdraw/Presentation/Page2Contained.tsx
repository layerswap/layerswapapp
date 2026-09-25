import type { ReactNode } from 'react';

/** The same contained layout that Page 2 uses inside the live swap drawer. */
export function Page2Contained({ children }: { children: ReactNode }) {
    return (
        <div className="w-full flex flex-col flex-1 justify-between h-full space-y-2 text-secondary-text">
            {children}
        </div>
    );
}
