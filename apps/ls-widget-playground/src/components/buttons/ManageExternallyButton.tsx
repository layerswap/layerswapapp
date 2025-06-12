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
        <div className="tw-my-1 tw-rounded-xl tw-p-3 tw-bg-secondary-600 tw-flex tw-items-center tw-justify-between tw-gap-1 tw-h-12">
            {
                ManageValues.map((v, index) => (
                    <button
                        key={index}
                        className={clsx('tw-rounded-xl tw-transition-colors tw-gap-1 tw-place-self-center tw-w-full tw-py-2', {
                            'tw-bg-primary-500': customEvmSwitch === v.value,
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
        <div className="tw-flex tw-justify-between tw-w-full">
            <label>
                Manage wallet externally
            </label>
            <div className="tw-flex tw-items-center tw-space-x-1.5">
                <p>{customEvmSwitch ? "Yes" : "No"}</p>
            </div>
        </div>
    );
}
