import LayerswapWidget from '@/components/LayerswapWidget';
import { ControlPanel } from './ControlPanel';
export function HomeComponent() {
    return (
        <div className='flex h-screen w-full overflow-hidden'>
            <ControlPanel />
            <LayerswapWidget />
        </div>
    );
}

