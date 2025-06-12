"use client";
import LayerswapWidget from '@/components/LayerswapWidget';
import { ControlPanel } from './ControlPanel';
import { PanelLeft } from 'lucide-react';
import { useWidgetContext } from '@/context/ConfigContext';
import clsx from 'clsx';

export function HomeComponent() {
    const { showPanel, updateShowPanel } = useWidgetContext();
    return (
        <div className="tw-flex tw-h-screen tw-w-full tw-overflow-hidden">
            <div
                className={clsx(
                    'tw-absolute tw-left-0 tw-top-0 tw-h-full tw-z-20 tw-transition-transform tw-duration-300 tw-ease-in-out',
                    showPanel ? 'tw-translate-x-0' : '-tw-translate-x-full'
                )}
            >
                <ControlPanel />
            </div>
            {!showPanel && (
                <PanelLeft
                    onClick={() => updateShowPanel(true)}
                    className="tw-absolute tw-top-4 tw-left-4 tw-z-15 tw-bg-transparent hover:tw-bg-primary-500 tw-transition-colors tw-text-primary-text tw-w-10 tw-h-auto tw-p-1.5 tw-rounded-full"
                />
            )}
            <div
                className={clsx(
                    'tw-flex-1 tw-transition-all tw-duration-300 tw-ease-in-out',
                    showPanel ? 'tw-ml-[600px]' : 'tw-ml-0'
                )}
            >
                <LayerswapWidget />
            </div>
        </div>
    );
}

