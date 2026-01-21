import clsx from "clsx"
import { ButtonHTMLAttributes, FC } from "react"
import SpinIcon from "../icons/spinIcon"

type buttonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type SecondaryButtonProps = {
    size?: buttonSize
    children: React.ReactNode
    isLoading?: boolean
}

const SecondaryButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & SecondaryButtonProps> = (props) => {
    const { className, isLoading, children, ...buttonProps } = props
    const size = props.size || 'md'

    return (
        <button
            {...buttonProps}
            type="button"
            disabled={props.disabled || isLoading}
            className={clsx('rounded-md duration-200 break-keep transition bg-secondary-500 hover:bg-secondary-400 border border-secondary-400 hover:border-secondary-200 font-semibold text-primary-text shadow-xs cursor-pointer disabled:bg-secondary-300 disabled:text-secondary-text/50 disabled:cursor-not-allowed relative flex items-center justify-center space-x-2', className, {
                'px-2 py-1 text-xs': size === 'xs',
                'px-2 py-1 text-sm': size === 'sm',
                'px-2.5 py-1.5 text-sm': size === 'md',
                'px-3 py-2 text-sm': size === 'lg',
                'px-3.5 py-2.5 text-sm rounded-xl': size === 'xl',
            })}
        >
            {isLoading && <SpinIcon className="animate-spin h-4 w-4" />}
            <span>{children}</span>
        </button>
    )
}

export default SecondaryButton
