import clsx from "clsx"
import { ButtonHTMLAttributes, FC } from "react"

type buttonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type SecondaryButtonProps = {
    size?: buttonSize
    children: React.ReactNode
}

const SecondaryButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & SecondaryButtonProps> = (props) => {
    const { className } = props
    const size = props.size || 'md'

    return (
        <button
            {...props}
            type="button"
            className={clsx('rounded-xl duration-200 break-keep transition bg-secondary-500 hover:bg-secondary-400 border border-secondary-400 hover:border-secondary-200 font-semibold text-primary-buttonTextColor shadow-xs cursor-pointer', className, {
                'px-2 py-1 text-xs': size === 'xs',
                'px-2 py-1 text-sm': size === 'sm',
                'px-2.5 py-1.5 text-sm': size === 'md',
                'px-3 py-2 text-sm': size === 'lg',
                'px-3.5 py-2.5 text-sm': size === 'xl',
            })}
        >
            {props.children}
        </button>
    )
}

export default SecondaryButton
