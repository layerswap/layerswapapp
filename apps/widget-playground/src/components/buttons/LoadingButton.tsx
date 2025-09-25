"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import clsx from "clsx";

const ManageValues = [
    { value: true, component: <><span>On</span></> },
    { value: false, component: <> <span>Off</span></> },
]

export function LoadingButton() {
    const { showLoading, updateShowLoading } = useWidgetContext();

    return (
        <div className="my-1 rounded-xl py-3 px-2 bg-secondary-600  flex items-center justify-between gap-1 h-12 hover:bg-secondary-500 transition-colors duration-200">
            {
                ManageValues.map((v, index) => (
                    <button
                        key={index}
                        className={clsx('rounded-xl transition-colors gap-1 place-self-center w-full py-2', {
                            'bg-primary-500': showLoading === v.value,
                        })}
                        onClick={() => { updateShowLoading(v.value) }}
                    >
                        {v.component}
                    </button>
                ))
            }
        </div>
    );
}

export const LoadingButtonTrigger = () => {
    const { showLoading } = useWidgetContext();

    return (
        <div className="flex justify-between w-full">
            <label>
                Preview loading
            </label>
            <div className="flex items-center space-x-1.5 text-secondary-text">
                <p>{showLoading ? "On" : "Off"}</p>
            </div>
        </div>
    );
}