"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import clsx from "clsx";

const ManageValues = [
    { value: true, component: <><span>Yes</span></> },
    { value: false, component: <> <span>No</span></> },
]

export function ManageExternallyButton() {
    const { customEvmSwitch, updateCustomEvmSwitch } = useWidgetContext();

    return (
        <div className="my-1 rounded-xl py-3 px-2 bg-secondary-600  flex items-center justify-between gap-1 h-12 hover:bg-secondary-500 transition-colors duration-200">
            {
                ManageValues.map((v, index) => (
                    <button
                        key={index}
                        className={clsx('rounded-xl transition-colors gap-1 place-self-center w-full py-2', {
                            'bg-primary-500': customEvmSwitch === v.value,
                        })}
                        onClick={() => { updateCustomEvmSwitch(v.value) }}
                    >
                        {v.component}
                    </button>
                ))
            }
        </div>
    )
}

export const ManageExternallyTriger = () => {
    const { customEvmSwitch } = useWidgetContext();

    return (
        <div className="flex justify-between w-full">
            <label>
                Manage wallet externally
            </label>
            <div className="flex items-center space-x-1.5 text-secondary-text">
                <p>{customEvmSwitch ? "Yes" : "No"}</p>
            </div>
        </div>
    );
}
