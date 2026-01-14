import { FC } from 'react'
import { Switch } from '@headlessui/react'
import { classNames } from '../utils/classNames';

export class ToggleButtonProps {
    value: boolean;
    onChange: (isChecked: boolean) => void;
    disabled?: boolean;
}

const ToggleButton: FC<ToggleButtonProps> = ({ onChange, value, disabled = false }) => {
    return (
        <Switch
            checked={value}
            onChange={onChange}
            disabled={disabled}
            className={classNames(
                value ? 'bg-primary-500' : 'bg-secondary-800',
                'navigation-focus-border-text-lg relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-hidden'
            )}
        >
            <span className="sr-only">Use setting</span>
            <span
                className={classNames(
                    value ? 'translate-x-5 bg-primary-text' : 'bg-secondary-400 translate-x-0',
                    'pointer-events-none relative inline-block h-5 w-5 rounded-full shadow-sm transform ring-0 transition ease-in-out duration-200'
                )}
            >
                <span
                    className={classNames(
                        value ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200',
                        'absolute inset-0 h-full w-full flex items-center justify-center transition-opacity'
                    )}
                    aria-hidden="true"
                >
                    <svg className="h-2 w-2 text-primary-text-tertiary" viewBox="0 0 8 8" fill="none">
                        <path
                            fill="currentColor"
                            strokeLinejoin="round" d="M1.51601 0.459928C1.44892 0.391517 1.36852 0.337587 1.27977 0.301468C1.19102 0.265349 1.0958 0.247807 1.00001 0.249928C0.799761 0.248203 0.606481 0.323367 0.46001 0.459928C0.32345 0.606399 0.248285 0.799679 0.25001 0.999928C0.25001 1.20293 0.32001 1.37493 0.46001 1.51593L2.94601 3.99993L0.46201 6.48393C0.393238 6.55085 0.338937 6.63117 0.30247 6.71993C0.266004 6.80869 0.248149 6.90399 0.25001 6.99993C0.25001 7.20293 0.32001 7.38293 0.46001 7.53993C0.61701 7.67993 0.79701 7.74993 1.00001 7.74993C1.20301 7.74993 1.37501 7.67993 1.51601 7.53993L4.00001 5.05393L6.48401 7.53793C6.62501 7.67793 6.79701 7.74893 7.00001 7.74893C7.20301 7.74893 7.38301 7.67893 7.54001 7.53893C7.67657 7.39246 7.75173 7.19918 7.75001 6.99893C7.75213 6.90313 7.73459 6.80792 7.69847 6.71917C7.66235 6.63042 7.60842 6.55002 7.54001 6.48293L5.05401 3.99993L7.53801 1.51593C7.67801 1.37493 7.74901 1.20293 7.74901 0.999928C7.75073 0.799679 7.67557 0.606399 7.53901 0.459928C7.39254 0.323367 7.19926 0.248203 6.99901 0.249928C6.90321 0.247807 6.808 0.265349 6.71925 0.301468C6.6305 0.337587 6.5501 0.391517 6.48301 0.459928L4.00001 2.94593L1.51601 0.460928V0.459928Z" />
                    </svg>

                </span>
                <span
                    className={classNames(
                        value ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100',
                        'absolute inset-0 h-full w-full flex items-center justify-center transition-opacity'
                    )}
                    aria-hidden="true"
                >
                    <svg className="h-3 w-3 text-primary-800" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                    </svg>
                </span>
            </span>
        </Switch>
    )
}

export default ToggleButton


