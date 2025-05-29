import { CardRadiusButton, ThemeButton, ResetButton, CloseButton, ColorsButton } from "./buttons";
export function ControlPanel() {
    return (
        <div className="text-primary-text w-[600px] min-h-screen bg-secondary-800  overflow-y-auto h-full styled-scroll">
            <div className="flex items-center justify-between h-16 p-4 shrink-0 sticky top-0 bg-secondary-800 z-20">
                <h1 className="text-2xl ">Layerswap Widget</h1>
                <div className='flex gap-4 justify-end'>
                    <ResetButton />
                    <CloseButton />
                </div>
            </div>
            <div className="flex flex-col p-6 gap-4 w-full">
                <CardRadiusButton />
                <ColorsButton />
            </div>
        </div>
    );
}
