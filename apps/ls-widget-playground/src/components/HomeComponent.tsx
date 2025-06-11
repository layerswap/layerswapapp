"use client";
import LayerswapWidget from '@/components/LayerswapWidget';
import { ControlPanel } from './ControlPanel';
import { PanelLeft } from 'lucide-react';
import { useWidgetContext } from '@/context/ConfigContext';
import clsx from 'clsx';

export function HomeComponent() {
    const { showPanel, updateShowPanel } = useWidgetContext();
    return (
        <div className='flex h-screen w-full overflow-hidden'>
            <div
                className={clsx(
                    'absolute left-0 top-0 h-full z-20 transition-transform duration-300 ease-in-out',
                    showPanel ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <ControlPanel />
            </div>
            {!showPanel && (
                <PanelLeft
                    onClick={() => updateShowPanel(true)}
                    className="absolute top-4 left-4 z-15 bg-transparent hover:bg-primary-500 transition-colors text-primary-text w-10 h-auto p-1.5 rounded-full"
                />
            )}
            <div
                className={clsx(
                    'flex-1 transition-all duration-300 ease-in-out',
                    showPanel ? 'ml-[600px]' : 'ml-0'
                )}
            >
                <LayerswapWidget />
            </div>
        </div>
    );
}

